/**
 * @author: srinivasaimandi
 */

class User {
    constructor({ id, name, email, username, password }) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.username = username;
        this.password = password;
    }

    // What API responses show: everything except the password
    static toPublic(user) {
        const { password, ...publicFields } = user;
        return publicFields;
    }
}

module.exports = User;