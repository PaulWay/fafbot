// let mysql = require('mysql')
import { Sequelize } from 'sequelize';

let connection = new Sequelize(
    // process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASS,
    'fafbot', 'brackman', 'socket',
    { dialect: 'postgres', dialectOptions: {
        socketPath: '/tmp/.s.PGSQL.5432'
    }}
);

// let connection = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABASE
// })

// connection.connect();

// connection.authenticate().then(() => {
//     console.log('Connected to database');
// }).catch(err => {
//     console.error('Unable to connect to database:', err)
// }).finally(() => {
//     connection.close();
// });

export default connection;
