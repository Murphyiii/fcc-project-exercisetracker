const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config()

// For parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Configuration
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define Schema
let userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true
    }
  },
  {
    collection: 'users'
  }
);

let exerciseSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    }
  },
  {
    collection: 'exercises'
  }
);

let UserModel = mongoose.model("UserModel", userSchema);
let ExericeModel = mongoose.model("ExericeModel", exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', (req, res) => {
  let newUsername = req.body.username;
  let newUserDoc = UserModel({
    username: newUsername
  });
  newUserDoc.save().then((data) => {
    res.json({
      username: data.username,
      _id: data._id
    });
  });
});

app.get('/api/users', (req, res) => {
  UserModel.find().then((data) => {
    res.json(data);
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  // find username by id
  let id = req.params._id;
  UserModel.findById(id).then((user) => {
    // create new exercise
    let newExercise = ExericeModel({
      username: user.username,
      description: req.body.description,
      duration: req.body.duration,
      date: (req.body.date !== undefined ? new Date(req.body.date) : new Date())
    });
    newExercise.save().then((exercise) => {
      res.json({
        _id: user._id,
        username: user.username,
        date: new Date(exercise.date).toDateString(),
        duration: exercise.duration,
        description: exercise.description
      });
    });
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  let id = req.params._id;
  let findConditions = {};
  if ((req.query.from !== undefined && req.query.from !== '') || (req.query.to !== undefined && req.query.to !== '')) {
		findConditions.date = {};
		if (req.query.from !== undefined && req.query.from !== '') {
			findConditions.date.$gte = new Date(req.query.from);
		}
		if (findConditions.date.$gte == 'Invalid Date') {
			return res.json({ error: 'from date is invalid' });
		}
		if (req.query.to !== undefined && req.query.to !== '') {
			findConditions.date.$lte = new Date(req.query.to);
		}
		if (findConditions.date.$lte == 'Invalid Date') {
			return res.json({ error: 'to date is invalid' });
		}
	}
  let limit = (req.query.limit !== undefined ? parseInt(req.query.limit) : 0);
	if (isNaN(limit)) {
		return res.json({ error: 'limit is not a number' });
	}
  UserModel.findById(id).then((user) => {
    findConditions.username = user.username;
    console.log(findConditions);
    ExericeModel
      .count(findConditions)
      .limit(limit)
      .then((count) => {
      ExericeModel
        .find(findConditions)
        .select(["-_id", "-userid", "-__v"])
        .limit(limit)
        .then((exercise) => {
        res.json({
          _id: id,
          username: user.username,
          count: count,
          log: exercise.map(function (data) {
            return {
              description: data.description,
              duration: data.duration,
              date: new Date(data.date).toDateString()
            };
          }),
        });
      });
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
