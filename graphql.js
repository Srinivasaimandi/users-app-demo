/**
 * @author: srinivasaimandi
 */

const { gql, UserInputError, ForbiddenError } = require("apollo-server-express");
const { getData, saveData, resetData } = require("./utils/dataUtils");
const {
  PROTECTED_USER_IDS,
  validateNewUser,
  validateUserUpdate,
  pickUserUpdates,
  nextUserId,
} = require("./utils/userValidation");

const typeDefs = gql`
  # Passwords can be set (createUser, updateUser) but are never returned
  type User {
    id: Int!
    name: String!
    email: String!
    username: String!
  }

  type Query {
    users: [User!]!
    user(id: Int!): User
    searchUsers(name: String, email: String): [User!]!
    userCount: Int!
  }

  type Mutation {
    createUser(
      name: String!
      email: String!
      username: String!
      password: String!
    ): User!
    bulkAddUsers(users: [NewUserInput!]!): [User!]!
    updateUser(
      id: Int!
      name: String
      email: String
      username: String
      password: String
    ): User
    deleteUser(id: Int!): Boolean!
    resetData: Boolean!
  }

  input NewUserInput {
    name: String!
    email: String!
    username: String!
    password: String!
  }
`;

const resolvers = {
  Query: {
    users: () => {
      const data = getData();
      return data.users;
    },
    user: (_, { id }) => {
      const data = getData();
      return data.users.find((u) => u.id === id);
    },
    searchUsers: (_, { name, email }) => {
      const data = getData();
      let results = data.users;
      if (name) {
        results = results.filter((u) =>
          u.name.toLowerCase().includes(name.toLowerCase())
        );
      }
      if (email) {
        results = results.filter((u) =>
          u.email.toLowerCase().includes(email.toLowerCase())
        );
      }
      return results;
    },
    userCount: () => {
      const data = getData();
      return data.users.length;
    },
  },
  Mutation: {
    createUser: (_, { name, email, username, password }) => {
      const data = getData();
      const newUser = {
        id: nextUserId(data),
        ...pickUserUpdates({ name, email, username, password }),
      };
      const error = validateNewUser(data.users, newUser);
      if (error) {
        throw new UserInputError(error);
      }
      data.users.push(newUser);
      saveData(data);
      return newUser;
    },
    bulkAddUsers: (_, { users: newUsers }) => {
      const data = getData();
      const addedUsers = [];
      newUsers.forEach((userData) => {
        const newUser = { id: nextUserId(data), ...pickUserUpdates(userData) };
        // Invalid users and duplicates are skipped; the rest are added.
        if (validateNewUser(data.users, newUser)) {
          return;
        }
        data.users.push(newUser);
        addedUsers.push(newUser);
      });
      saveData(data);
      return addedUsers;
    },
    updateUser: (_, { id, ...args }) => {
      if (PROTECTED_USER_IDS.includes(id)) {
        throw new ForbiddenError(`User with id ${id} is restricted from editing`);
      }
      const data = getData();
      const userIndex = data.users.findIndex((u) => u.id === id);
      if (userIndex === -1) return null;
      const updates = pickUserUpdates(args);
      const error = validateUserUpdate(data.users, id, updates);
      if (error) {
        throw new UserInputError(error);
      }
      data.users[userIndex] = { ...data.users[userIndex], ...updates };
      saveData(data);
      return data.users[userIndex];
    },
    deleteUser: (_, { id }) => {
      const data = getData();
      const userIndex = data.users.findIndex((u) => u.id === id);
      if (PROTECTED_USER_IDS.includes(id)) return false;
      else if (userIndex === -1) return false;
      else {
        data.users.splice(userIndex, 1);
        saveData(data);
        return true;
      }
    },
    resetData: () => {
      try {
        resetData();
        return true;
      } catch (error) {
        return false;
      }
    },
  },
};

module.exports = { typeDefs, resolvers };
