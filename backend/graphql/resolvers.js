const bcrypt = require("bcryptjs");
const validator = require("validator")

const User = require("../models/user");

module.exports = {
  createUser: async function createUser({ userInput }, req) {

    const errors = []

    if (validator.isEmpty(userInput.email) || !validator.isEmail(userInput.email)) {
        errors.push({ message: "Please enter a valid email address." })
    }

    if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 4 })) {
        errors.push({ message: "Password too short." })
    }

    if (validator.isEmpty(userInput.name) || !validator.isLength(userInput.name, { min: 3 })) {
        errors.push({ message: "Please enter a valid name." })
    }

    if (errors.length > 0) {
        const error = new Error(errors[0].message || "Input validation failed.")
        error.code = 422;
        error.data = errors
        throw error
    }

    const existingUser = await User.findOne({ email: userInput.email });

    if (existingUser) {
      throw new Error("This email address already exist.");
    }

    const hashedPw = await bcrypt.hash(userInput.password, 12);

    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPw,
    });

    const createdUser = await user.save()
    return { ...createdUser._doc, _id: createdUser._id.toString() }

  },
};
