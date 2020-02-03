import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import {merge} from 'lodash';


var app = express();

// view engine setup -------------------------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
//const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));
// --------------------------------------------------------

// Schemas and Resolvers ----------------------------------

// --------------------------------------------------------

// GraphQl Server -----------------------------------------
import gqlHttp from "express-graphql";
import {
  makeExecutableSchema
} from 'graphql-tools';

import {
  typeDefs as quizDefs,
  resolvers as quizResolves
} from './routes/quiz.js'

import {
  typeDefs as userDefs,
  resolvers as userResolves
} from './routes/users.js'


app.use("/api", gqlHttp({
  pretty: true,
  graphiql: true,
  schema: makeExecutableSchema({
    typeDefs: [quizDefs,userDefs],
    resolvers: merge(quizResolves,userResolves)
  }),
  rootValue: quizResolves
}))
// --------------------------------------------------------



// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export {
  app
};