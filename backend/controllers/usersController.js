const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").lean();

  // If no users
  if (!users?.length) {
    return res.status(400).json({ message: "No users found" });
  }

  res.json(users);
});

// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async (req, res) => {
  const { username, email, password, roles } = req.body;

  // Confirm data
  if (
    !username ||
    !email ||
    !password ||
    !Array.isArray(roles) ||
    !roles.length
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check for duplicate
  const duplicate = await User.findOne({ email }).lean().exec();

  if (duplicate) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash the password

  const hashedPassword = await bcrypt.hash(password, 10);

  const userObject = { username, email, password: hashedPassword, roles };

  const user = await User.create(userObject);

  if (user) {
    return res.status(201).json({ message: `New user ${username} created` });
  } else {
    return res.status(400).json({ message: "Invalid user data" });
  }
});

// @desc Update user
// @route PATCH /users
// @access Private
const updateUser = asyncHandler(async (req, res) => {
  const { id, username, email, roles, active, password } = req.body;

  // Confirm data
  if (
    !id ||
    !username ||
    !email ||
    !Array.isArray(roles) ||
    !roles.length ||
    typeof active !== "boolean"
  ) {
    return res
      .status(400)
      .json({ message: "All fields except password are required" });
  }

  //Does the user exist to update?
  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Check for duplicate email
  const duplicate = await User.findOne({ email }).lean().exec();

  // Allow updates to the original user
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate email" });
  }

  user.username = username;
  user.email = email;
  user.roles = roles;
  user.active = active;

  if (password) {
    // Hash password
    user.password = await bcrypt.hash(password, 10);
  }

  const updatedUser = await user.save();

  res.json({ message: `${updatedUser.username} updated` });
});

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "user ID required" });
  }

  const notes = await Note.findOne({ user: id }).lean().exec();

  if (notes?.length) {
    return res.status(400).json({ message: "User has notes assigned" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const result = await user.deleteOne();

  const reply = `Username ${user.username} with ID ${user._id}`;

  res.json(reply);
});

module.exports = { getAllUsers, createNewUser, updateUser, deleteUser };
