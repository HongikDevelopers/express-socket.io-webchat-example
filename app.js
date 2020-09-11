const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const ColorHash = require('color-hash');

dotenv.config();
const webSocket = require('./socket');
const indexRouter = require('./routes');
const { sequelize } = require('./models');

const app = express();
sequelize.sync();

app.set('port', process.env.PORT || 80);
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});

const sessionMiddleware = session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httponly: true,
        secure: false,
    },
});

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(sessionMiddleware);

app.use((req, res, next) => {
    if (!req.session.color) {
        const colorHash = new ColorHash();
        req.session.color = colorHash.hex(req.sessionID);
    }
    console.log("req.session: ", req.session);
    next();
});

app.use('/', indexRouter);

app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

const server = app.listen(app.get('port'), () => {
    console.log(`excuting server ${app.get("port")}at port`)
});

webSocket(server, app, sessionMiddleware);