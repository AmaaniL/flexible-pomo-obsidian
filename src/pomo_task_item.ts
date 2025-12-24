export class PomoTaskItem {
  lineContent: string;
  isCompleted: boolean;
  filePath: string;
  estimatedMs?: number;
  naturalLanguageDate?: Date;

  constructor(
    lineContent: string,
    isCompleted: boolean,
    filePath: string,
    estimatedMs?: number,
    naturalLanguageDate?: Date
  ) {
    this.lineContent = lineContent;
    this.isCompleted = isCompleted;
    this.filePath = filePath;
    this.estimatedMs = estimatedMs;
    this.naturalLanguageDate = naturalLanguageDate;
  }
}
