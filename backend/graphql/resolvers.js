const bcrypt = require("bcryptjs");

const User = require("../models/user");

module.exports = {
  createUser: async function createUser({ userInput }, req) {
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
