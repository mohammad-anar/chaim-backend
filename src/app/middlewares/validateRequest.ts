import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

const validateRequest =
  (schema: ZodTypeAny) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let parsedBody: any = {};

      if (req.body) {
        if (typeof req.body === "string") {
          parsedBody = JSON.parse(req.body);
        } else if (req.body.data && typeof req.body.data === "string") {
          parsedBody = JSON.parse(req.body.data);
        } else {
          parsedBody = req.body;
        }
      }

      const validatedData = (await schema.parseAsync(parsedBody)) as Record<string, any>;

      req.body = typeof validatedData === "object" && validatedData !== null
        ? { ...parsedBody, ...validatedData }
        : validatedData;
      next();
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

export default validateRequest;
