/**
 * @author: srinivasaimandi
 */

class User {
  constructor({ id, name, email, username, password, status = "active" }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.username = username;
    this.password = password;
    this.status = status;
  }
}

module.exports = User;
