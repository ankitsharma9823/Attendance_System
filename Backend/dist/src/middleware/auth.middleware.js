import { verifyToken } from "../utils/jjwt";
export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ msg: "No token provided" });
        }
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ msg: "Invalid or expired token" });
    }
};
