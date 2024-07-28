const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(bodyParser.json());
app.use(cors());

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    balance REAL NOT NULL
  )`);
});

// Your route handlers will go here

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const addTransaction = (transaction, callback) => {
    db.serialize(() => {
      db.get("SELECT balance FROM transactions ORDER BY id DESC LIMIT 1", (err, row) => {
        if (err) {
          return callback(err);
        }
        const previousBalance = row ? row.balance : 0;
        const newBalance = transaction.type === 'Credit' ? previousBalance + transaction.amount : previousBalance - transaction.amount;
        db.run(`INSERT INTO transactions (type, amount, description, date, balance) VALUES (?, ?, ?, ?, ?)`,
          [transaction.type, transaction.amount, transaction.description, transaction.date, newBalance], function (err) {
            if (err) {
              return callback(err);
            }
            callback(null, { id: this.lastID, ...transaction, balance: newBalance });
          });
      });
    });
  };
  app.get('/api/transactions', (req, res) => {
    db.all("SELECT * FROM transactions ORDER BY date DESC", [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });
  
  app.post('/api/transactions', (req, res) => {
    const { type, amount, description, date } = req.body;
    if (!type || !amount || !description || !date) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    addTransaction({ type, amount, description, date }, (err, transaction) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json(transaction);
    });
  });
    