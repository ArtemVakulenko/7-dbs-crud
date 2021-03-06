import mysql  from 'mysql'
import { BaseConnector }  from './BaseConnector.js'
import { JsonReader } from '../service/JsonReader.js'


class MySQLConnector extends BaseConnector {
  #connection
  
  constructor(){
    super()

    const connections = new JsonReader().read('connections.json').mysql_connection

    const name = connections.database
    delete connections.database

    this.#connection = mysql.createConnection({
      ...connections
    })

    this.#migrate(connections, name)
  }

  #migrate(connection, name) {
    this.#query(`CREATE DATABASE IF NOT EXISTS ${name}`, err => {
      if (err) {
        return console.error(`Error: ${err.message}`)
      }

      this.#query(`USE \`${name}\``, err => {
        if (err) {
          return console.error(`Error: ${err.message}`)
        }

        this.#query(`CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          login VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          deleted BOOLEAN NOT NULL
        )`, err => {
          if (err) {
            return console.error(`Error: ${err.message}`)
          }

          this.#query(`CREATE TABLE IF NOT EXISTS persons (
              id INT AUTO_INCREMENT PRIMARY KEY,
              fname VARCHAR(255) NOT NULL,
              lname VARCHAR(255) NOT NULL,
              age INT NOT NULL,
              city VARCHAR(255) NOT NULL,
              phoneNumber VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL,
              companyName VARCHAR(255) NOT NULL,
              user_id INT NOT NULL,
              deleted BOOLEAN NOT NULL,
              CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
            )`, err => {
            if (err) {
              return console.error(`Error: ${err.message}`)
            }
            this.#close()
            this.#connection = mysql.createConnection({...connection, database: `${name}`})
            this.#open()
          })
        })
      })
    })
  }

  #open() {
    this.#connection.connect(err =>{
      if (err) {
        return console.error(`Error: ${err.message}`)
      }
      console.log('Connection to MySQL successfully opened');
    })
  }

  #query(query, func) {
    this.#connection.query(query, func)
  }

  #close() {
    this.#connection.end(err => {
      if (err) {
        return console.error(`Error: ${err.message}`)
      }
    })
  }
  
  getAllPersons(func) {
    super.getAllPersons(func)
    this.#query('SELECT * FROM persons', func)
  }

  getPersons(func) {
    super.getPersons(func)
    this.#query('SELECT * FROM persons WHERE deleted = 0', func)
  }

  getUsers(func) {
    this.#query('SELECT * FROM users WHERE deleted = 0', func)
  }

  getAllUsers(func) {
    this.#query('SELECT * FROM users', func)
  }
  
  getPersonsByUserId(user_id, func) {
    super.getPersonsByUserId(user_id, func)
    this.#query(`SELECT * FROM persons WHERE user_id =${user_id} AND deleted=0`, func)
  }

  getDeletedPersonsByUserId(user_id, func) {
    super.getDeletedPersonsByUserId(user_id, func)
    this.#query(`SELECT * FROM persons WHERE user_id =${user_id} AND deleted=1`, func)
  }

  postPerson(person, func) {
    super.postPerson(person, func)
    this.#query(`INSERT INTO persons VALUES (DEFAULT, '${person.fname}', '${person.lname}', ${person.age}, '${person.city}', '${person.phoneNumber}', '${person.email}', '${person.companyName}', ${person.user_id}, FALSE)`, func)
  }

  postUser(user, func) {
    this.#query(`INSERT INTO users VALUES (DEFAULT, '${user.login}', '${user.password}', FALSE)`, func)
  }

  deletePersonById (personId, func) {
    super.deletePersonById(personId, func)
    this.#query(`SELECT * FROM persons WHERE id=${personId} AND deleted=0`, (err,rows) => {
      this.#query(`UPDATE persons SET deleted=1 WHERE id=${personId}`, (err1,rows1) =>{
        if (rows.length === 0) {
          func(new Error(), null)
        } else {
          func(null,rows1)
        }
      })
    })
  }

  putPersonBack (personId, func) {
    super.putPersonBack(personId, func)

    this.#query(`UPDATE persons SET deleted=0 WHERE id=${personId}`, (err,rows) => {
      this.#query(`SELECT * FROM persons WHERE id=${personId} AND deleted=1`, (err1,rows1) =>{
        if (rows1.length === 0) {
          func(new Error(), null)
        } else {
          func(null,rows)
        }
      })
    })
  }

  deleteUserById (userId, func) {

    this.#query(`UPDATE persons SET deleted=1 WHERE user_id=${userId}`, () => {})
    this.#query(`UPDATE users SET deleted=1 WHERE id=${userId}`, (err,rows) => {
      this.#query(`SELECT * FROM users WHERE id=${userId} AND deleted=0` , (err1,rows1) =>{
        if (rows1.length === 0) {
          func(new Error(), null)
        } else {
          func(null,rows)
        }
      } )
    })
  }

  deletePersonsByUserId (userId, func) {
    super.deletePersonsByUserId(userId, func)

    this.#query(`SELECT * FROM persons WHERE user_id=${userId} AND deleted=0`, (err,rows) => {
      this.#query(`UPDATE persons SET deleted=1 WHERE user_id=${userId}`, (err1,rows1) =>{
        if (rows.length === 0) {
          func(new Error(), null)
        } else {
          func(null,rows1)
        }
      })
    })
  }

  putPersonsBackByUserId (userId, func) {
    super.putPersonsBackByUserId(userId, func)

    this.#query(`SELECT * FROM persons WHERE user_id=${userId} AND deleted=1`, (err,rows) => {
      this.#query(`UPDATE persons SET deleted=0 WHERE user_id=${userId}`, (err1,rows1) =>{
        if (rows.length === 0) {
          func(new Error(), null)
        } else {
          func(null,rows1)
        }
      })
    })
  }

  putPerson(person, func) {
    super.putPerson(person, func)
    this.#query(`UPDATE persons SET fname='${person.fname}', lname='${person.lname}', age=${person.age}, city='${person.city}', phoneNumber='${person.phoneNumber}', email='${person.email}', companyName='${person.companyName}' WHERE id=${person.id}`, func)
  }

  putUser(user, func) {
    this.#query(`UPDATE users SET login='${user.login}', password='${user.password}' WHERE id=${user.id}`, func)
  }

  getUserByLoginAndPassword(user, func) {
    this.#query(`SELECT * FROM users WHERE login='${user.login}' AND password='${user.password}'`, func)
  }

  getUserByLogin(user, func) {
    this.#query(`SELECT * FROM users WHERE login='${user.login}'`, func)
  }

  putUserBack(userId, func) {
    this.#query(`UPDATE users SET deleted=0 WHERE id=${userId}`, func)
  }

}
  
export { MySQLConnector }