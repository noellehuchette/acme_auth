const express = require('express');
const app = express();
app.use(express.json());
const { models: { User } } = require('./db');
const path = require('path');

const requireToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const user = await User.byToken(token);
    req.user = user;
    next();
  }
  catch (ex) { next(ex) }
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  }
  catch (ex) {
    next(ex);
  }
});

app.get('/api/auth', requireToken, async (req, res, next) => {
  try {
    res.send(await User.byToken(req.headers.authorization));
  }
  catch (ex) {
    next(ex);
  }
});

app.get('/api/users/:id/notes', requireToken, async (req, res, next) => {
  try {
    if (+req.user.id === +req.params.id) {
      const user = await User.findByPk(req.params.id);
      const notes = await user.getNotes();
      res.send(notes);
    }
    else {
      res.status(403).send('forbidden!');
    }
  }
  catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;