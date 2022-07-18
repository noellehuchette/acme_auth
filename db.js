const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const config = {
  logging: false
};
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

const Note = conn.define('note', {
  text: STRING,
});

Note.belongsTo(User);
User.hasMany(Note);

User.byToken = async (token) => {
  try {
    const valid = jwt.verify(token, 'itsasecret');
    if (valid) {
      const user = await User.findByPk(valid.userId);
      if (user) {
        return user;
      }
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;

  }
  catch (ex) {
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username
    }
  });
  if (await bcrypt.compare(password, user.password)) {
    return jwt.sign({ userId: user.id }, 'itsasecret');
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user, options) => {
  const hash = await bcrypt.hash(user.password, 5);
  user.password = await hash;
});


const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw' },
    { username: 'moe', password: 'moe_pw' },
    { username: 'larry', password: 'larry_pw' }
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map(credential => User.create(credential))
  );
  const content =[
    {text: 'brush teeth'},
    {text: 'take out trash'},
    {text: 'do dishes'},
    {text: 'clean shower'},
    {text: 'mop'},
    {text: 'vacuum'},
    {text: 'buy groceries'},
    {text: 'blood sacrifice'},
    {text: 'call doctor'},
  ];
  const notes = await Promise.all(content.map(note => Note.create(note)));
  notes.map((note,idx) => {
    if (idx % 2 === 0) {
      lucy.setNotes(note);
    }
    else if (idx % 3 === 0) {
      moe.setNotes(note);
    }
    else {
      larry.setNotes(note);
    }
  });
  const ownedNotes = await Note.findAll({});
  return {
    users: {
      lucy,
      moe,
      larry
    },
    notes: ownedNotes,
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  }
};