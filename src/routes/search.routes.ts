import { Router } from "express";
import { publicSearch } from "../controllers/search.controller";

const router = Router();

router.get("/", publicSearch);

export default router;