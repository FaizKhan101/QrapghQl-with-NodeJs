const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Post = require("../models/post");

module.exports = {
  createUser: async function createUser({ userInput }, req) {
    const errors = [];

    if (
      validator.isEmpty(userInput.email) ||
      !validator.isEmail(userInput.email)
    ) {
      errors.push({ message: "Please enter a valid email address." });
    }

    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 4 })
    ) {
      errors.push({ message: "Password too short." });
    }

    if (
      validator.isEmpty(userInput.name) ||
      !validator.isLength(userInput.name, { min: 3 })
    ) {
      errors.push({ message: "Please enter a valid name." });
    }

    if (errors.length > 0) {
      const error = new Error(errors[0].message || "Input validation failed.");
      error.code = 422;
      error.data = errors;
      throw error;
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

    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function login({ email, password }) {
    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new Error("email address not exist.");
      error.code = 401;
      throw error;
    }

    const passwordIsEqual = await bcrypt.compare(password, user.password);

    if (!passwordIsEqual) {
      const error = new Error("Incorrect password.");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "somesupersecretsecret"
    );

    return { token: token, userId: user._id.toString() };
  },
  createPost: async function createPost({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const errors = [];

    if (validator.isEmpty(postInput.title)) {
      errors.push({ message: "Title is invalid." });
    }

    if (validator.isEmpty(postInput.content)) {
      errors.push({ message: "Content is invalid." });
    }

    if (errors.length > 0) {
      const error = new Error(errors[0].message || "Invalid input.");
      error.code = 422;
      error.data = errors;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("Invalid user!");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });

    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();
    return {
      ...createPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  posts: async function posts(args, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const totalPost = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("creator ");

    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString()
        };
      }),
      totalPost: totalPost,
    };
  },
};
