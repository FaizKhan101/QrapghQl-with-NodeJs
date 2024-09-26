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
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  posts: async function posts({ page }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }

    let perPage = 2;

    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },

  post: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate("creator");

    if (!post) {
      const error = new Error("Post with given id not exist.");
      error.code = 404;
      throw error;
    }

    console.log(post);

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  updatePost: async function updatePost({ id, postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
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

    post.title = postInput.title;
    post.content = postInput.content;

    if (postInput.imageUrl !== "undefined") {
      post.imageUrl = postInput.imageUrl;
    }

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
};
