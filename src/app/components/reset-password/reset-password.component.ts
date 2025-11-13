import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { MustMatch } from '../../../shared/helpers/must-match.validator';

@Component({
  selector: 'reset-password',
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  submitted = false;
  message = '';
  isError = false;
  public token: string;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token');

    if (!this.token) {
        this.message = "Invalid or missing password reset token.";
        this.isError = true;
    }

    this.form = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, {
        validator: MustMatch('password', 'confirmPassword')
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
     if (!this.token) {
        this.message = "Invalid or missing password reset token.";
        this.isError = true;
        return;
    }

    this.loading = true;
    this.userService.resetPassword(this.token, this.f.password.value).subscribe({
      next: (res) => {
        this.message = res.message + " Redirecting to login...";
        this.loading = false;
        setTimeout(() => {
            this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.message = err.error.message || 'An error occurred.';
        this.isError = true;
        this.loading = false;
      },
    });
  }
}