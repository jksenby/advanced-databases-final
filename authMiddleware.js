const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function (req, res, next) {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  if (!token.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token format is invalid" });
  }

  const tokenValue = token.split(" ")[1];
  console.log(tokenValue)

  try {
    const decoded = jwt.verify(tokenValue, JWT_SECRET);
    
    req.user = decoded.user;
    next();
  } catch (e) {
    res.status(401).json({ message: "Token is not valid" });
  }
};