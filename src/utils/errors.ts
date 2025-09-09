export class NotionSchemaError extends Error {
  pageUrl: string;
  hint?: string;
  constructor(message: string, pageUrl: string, hint?: string) {
    super(message);
    this.name = "NotionSchemaError";
    this.pageUrl = pageUrl;
    this.hint = hint;
  }
}

export class EdgeConfigWriteError extends Error {}
export class DriftDetectedError extends Error {}

