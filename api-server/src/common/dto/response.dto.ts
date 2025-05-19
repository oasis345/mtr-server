export class ApiResponse {
  success?: boolean = true;
  message?: string = '';
  code?: number = 200;
  data: any;

  constructor(res: ApiResponse) {
    this.success = res.success;
    this.code = res.code;
    this.message = res.message;
    this.data = res.data;
  }
}
