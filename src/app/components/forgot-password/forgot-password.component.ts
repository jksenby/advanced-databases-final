import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  submitted = false;
  message = '';
  isError = false;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.message = '';
    this.isError = false;

    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.userService.forgotPassword(this.f.email.value).subscribe({
      next: (res) => {
        this.message = res.message;
        this.loading = false;
        this.form.reset();
        this.submitted = false;
      },
      error: (err) => {
        this.message = err.error.message || 'An error occurred.';
        this.isError = true;
        this.loading = false;
      },
    });
  }
}