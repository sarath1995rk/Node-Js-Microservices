
import logger from "../utils/logger.js";
import jwt from "jsonwebtoken";

const validateToken = (req, res, next) => {
    const authHeaders = req.headers['authorization'];
    const token = authHeaders &&authHeaders.split(' ')[1];
    if (!token) {
        logger.error("Unauthorized");
        return res.status(401).json({ 
            success: false,
            message: "Unauthorized" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.error("Invalid token");
            return res.status(429).json({ 
                success: false,
                message: "Invalid token" });
        }
        req.user = user;
        next();
    });
    
    
}

export default validateToken;