// var typeorm = require("typeorm");
// var EntitySchema = typeorm.EntitySchema;
//
// const Users = require("./entity/Users")
//
// typeorm.createConnection({
//     name: "mysql",
//     type: "mysql",
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     username: process.env.DB_UN,
//     password: process.env.DB_PWD,
//     database: process.env.DB_NAME,
//     synchronize: true,
//     "logging": true,
//     entities: [
//         new EntitySchema(Users)
//     ]
// }).then(() => {
//
//     const dbConnection = typeorm.getConnection('mysql')
//
//     const repo = dbConnection.getRepository("Users")
//     return repo
// }).then((repo) => {
//
//
//     const exist_already = repo.findOne()
//     if (!exist_already) {
//         console.log('Seeding 2 users to MySQL users table: Liran (role: user), Simon (role: admin')
//
//         const inserts = [
//             repo.insert({
//                 name: "Liran",
//                 address: "IL",
//                 role: "user"
//             }),
//             repo.insert({
//                 name: "Simon",
//                 address: "UK",
//                 role: "admin"
//             })
//         ];
//
//         return Promise.all(inserts)
//     } else {
//         console.log("Users already exist, not seeding db anymore.")
//     }
// }).catch((err) => {
//     console.error('failed connecting and seeding users to the MySQL database')
//     console.error(err)
// })