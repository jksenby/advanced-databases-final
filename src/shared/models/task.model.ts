import { Priority } from "../enums/priority.enum";

export default interface ITask {
  name: string;
  created: Date;
  readiness: boolean;
  description: string;
  priority: Priority;
}
