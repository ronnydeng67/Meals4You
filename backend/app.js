const express = require("express");
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const debug = require('debug');

const cors = require('cors');
const csurf = require('csurf');
const { isProduction } = require('./config/keys');
const axios = require('axios');
const path = require('path')

// model
require('./models/user');
require('./models/Wheel');
require('./models/Dish');
require('./models/Favorite');

require('./config/passport');

// routers
const passport = require('passport');
const usersRouter = require('./routes/api/users');
const csrfRouter = require('./routes/api/csrf');
const yelpRouter = require('./routes/api/yelp')

const wheelsRouter = require('./routes/api/wheels');
const dishesRouter = require('./routes/api/dishes');
const favoritesRouter = require('./routes/api/favorites');


const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

// Set the _csrf token and create req.csrfToken method to generate a hashed
// CSRF token
app.use(
	csurf({
		cookie: {
			secure: isProduction,
			sameSite: isProduction && "Lax",
			httpOnly: true
		}
	})
);

// Security Middleware
if (!isProduction) {
	// Enable CORS only in development because React will be on the React
	// development server (http://localhost:3000). (In production, React files
	// will be served statically on the Express server.)
	app.use(cors());
} else { // isProduction
	const path = require('path');
	// Serve the frontend's index.html file at the root route
	app.get('/', (req, res) => {
	  res.cookie('CSRF-TOKEN', req.csrfToken());
	  res.sendFile(
		path.resolve(__dirname, '../frontend', 'build', 'index.html')
	  );
	});
  
	// Serve the static assets in the frontend's build folder
	app.use(express.static(path.resolve("../frontend/build")));
  
	// Serve the frontend's index.html file at all other routes NOT starting with /api
	app.get(/^(?!\/?api).*/, (req, res) => {
	  res.cookie('CSRF-TOKEN', req.csrfToken());
	  res.sendFile(
		path.resolve(__dirname, '../frontend', 'build', 'index.html')
	  );
	});
}

	
// Attach Express routers
app.use('/api/users', usersRouter);
app.use('/api/csrf', csrfRouter);
app.use('/api/wheels', wheelsRouter);
app.use('/api/dishes', dishesRouter);
app.use('/api/yelp', yelpRouter);
app.use('/api/favorites', favoritesRouter);

// Express custom middleware for catching all unmatched requests and formatting
// a 404 error to be sent as the response.
app.use((req, res, next) => {
	const err = new Error('Not Found');
	err.statusCode = 404;
	next(err);
});

const serverErrorLogger = debug('backend:error');

// Express custom error handler that will be called whenever a route handler or
// middleware throws an error or invokes the `next` function with a truthy value
app.use((err, req, res, next) => {
	serverErrorLogger(err);
	const statusCode = err.statusCode || 500;
	res.status(statusCode);
	res.json({
		message: err.message,
		statusCode,
		errors: err.errors
	})
});

module.exports = app;