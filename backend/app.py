from flask import Flask, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from datetime import datetime
import pytz

app = Flask(__name__)
CORS(app)

DB_NAME = "smart_expense.db"

# ------------------ DATABASE CONNECTION ------------------
def get_connection():
    conn = sqlite3.connect(DB_NAME, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

# ------------------ INITIALIZE DATABASE ------------------
def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Expenses table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES Users(id)
            )
        ''')
        
        # SavingsGoal table (single correct definition)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS SavingsGoal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                target REAL NOT NULL,
                achieved INTEGER DEFAULT 0,
                set_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES Users(id)
            )
        ''')

        # --- TotalBalance table ---
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS TotalBalance (
                user_id INTEGER PRIMARY KEY,
                balance REAL DEFAULT 0,
                goal REAL DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES Users(id)
            );
        ''')


        conn.commit()

init_db()

# ------------------ REGISTER ------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    hashed = generate_password_hash(password)

    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO Users (email, password_hash) VALUES (?, ?)",
                (email, hashed)
            )
            user_id = cursor.lastrowid
            # Initialize savings goal for new user
            cursor.execute(
                """
                INSERT OR REPLACE INTO SavingsGoal (user_id, target, achieved, set_date)
                VALUES (?, 0, COALESCE((SELECT achieved FROM SavingsGoal WHERE user_id=?), 0), CURRENT_TIMESTAMP)
                """,
                (user_id, user_id)  # matches the 2 placeholders
            )
            # Initialize TotalBalance row
            cursor.execute(
                """
                INSERT OR IGNORE INTO TotalBalance (user_id, balance, goal)
                VALUES (?, 0, 0)
                """,
                (user_id,)
            )
            conn.commit()
        return jsonify({"message": "User registered successfully", "id": user_id})
    except sqlite3.IntegrityError:
        return jsonify({"message": "Email already registered"}), 400
    except sqlite3.OperationalError as e:
        return jsonify({"message": f"Database error: {str(e)}"}), 500

# ------------------ LOGIN ------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Users WHERE email=?", (email,))
        user = cursor.fetchone()

    if not user:
        return jsonify({"message": "Email not registered"}), 400

    if check_password_hash(user["password_hash"], password):
        return jsonify({"id": user["id"], "email": user["email"]})
    else:
        return jsonify({"message": "Incorrect password"}), 400

# ------------------ DELETE USER ------------------
@app.route("/delete_user/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Users WHERE id=?", (user_id,))
        cursor.execute("DELETE FROM Expenses WHERE user_id=?", (user_id,))
        cursor.execute("DELETE FROM SavingsGoal WHERE user_id=?", (user_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "User deleted successfully"})
    except Exception as e:
        print(e)
        return jsonify({"message": "Failed to delete user"}), 500

# ------------------ GET EXPENSES ------------------
@app.route("/expenses/<int:user_id>", methods=["GET"])
def get_expenses(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Expenses WHERE user_id=? ORDER BY date DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

# ------------------ ADD EXPENSE ------------------
@app.route("/add_expense", methods=["POST"])
def add_expense():
    data = request.json
    user_id = data.get("user_id")
    category = data.get("category")
    amount = data.get("amount")
    description = data.get("description", "")

    if not user_id or not category or amount is None:
        return jsonify({"message": "Missing fields"}), 400

    try:
        tz = pytz.timezone('Asia/Manila')
        now_pht = datetime.now(tz)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Expenses (user_id, category, amount, description, date) VALUES (?, ?, ?, ?, ?)",
            (user_id, category, amount, description, now_pht)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Expense added successfully"})
    except Exception as e:
        print(e)
        return jsonify({"message": "Failed to add expense"}), 500

# ------------------ DELETE EXPENSE ------------------
@app.route("/delete_expense/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Expenses WHERE id=?", (expense_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Expense deleted successfully"})
    except Exception as e:
        print(e)
        return jsonify({"message": "Failed to delete expense"}), 500

# ------------------ GET SAVINGS GOAL ------------------
@app.route("/savings_goal/<int:user_id>", methods=["GET"])
def get_savings_goal(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT target, achieved FROM SavingsGoal WHERE user_id=?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return jsonify({"target": row["target"] if row else 0, "achieved": row["achieved"] if row else 0})

# ------------------ SET BALANCE ------------------
@app.route("/set_balance", methods=["POST"])
def set_balance():
    data = request.json
    user_id = data.get("user_id")
    balance = data.get("balance")

    if user_id is None or balance is None:
        return jsonify({"message": "Missing fields"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO TotalBalance (user_id, balance, goal)
        VALUES (?, ?, COALESCE((SELECT goal FROM TotalBalance WHERE user_id=?), 0))
        ON CONFLICT(user_id) DO UPDATE SET balance=excluded.balance
    """, (user_id, balance, user_id))

    conn.commit()
    conn.close()
    return jsonify({"message": "Total balance updated successfully"})

@app.route("/get_balance_goal/<int:user_id>", methods=["GET"])
def get_balance_goal(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT balance, goal FROM TotalBalance WHERE user_id=?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return jsonify({
        "balance": row["balance"] if row else 0,
        "savings_goal": row["goal"] if row else 0
    })



# ------------------ SET SAVINGS GOAL ------------------
@app.route("/set_savings_goal", methods=["POST"])
def set_savings_goal():
    data = request.json
    user_id = data.get("user_id")
    savings_goal = data.get("savings_goal")  # changed key from 'goal' to 'savings_goal'

    if user_id is None or savings_goal is None:
        return jsonify({"message": "Missing fields"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO TotalBalance (user_id, balance, goal)
        VALUES (?, COALESCE((SELECT balance FROM TotalBalance WHERE user_id=?), 0), ?)
        ON CONFLICT(user_id) DO UPDATE SET goal=excluded.goal
    """, (user_id, user_id, savings_goal))

    conn.commit()
    conn.close()
    return jsonify({"message": "Savings goal updated successfully"})


# ------------------ MAIN ------------------
if __name__ == "__main__":
    # For development, run single-threaded to avoid SQLite locks
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=False)
