import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import {
  BehaviorSubject,
  catchError,
  Observable,
  of,
  switchMap,
  tap,
} from "rxjs";
import { Router } from "@angular/router";
import { User } from "../../shared/models/user.model";

@Injectable()
export class UserService {
  private apiUrl = "http://localhost:3000";
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private httpOptions = {
    headers: new HttpHeaders({ "Content-Type": "application/json" }),
    withCredentials: true,
  };

  private getOptions = {
    withCredentials: true,
  };

  private publicHttpOptions = {
    headers: new HttpHeaders({ "Content-Type": "application/json" }),
  };

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  createUser(body): Observable<User | any> {
    return this.http.post<User | any>(
      `${this.apiUrl}/users`,
      body,
      { headers: this.httpOptions.headers }
    );
  }

  login(username, password): Observable<any> {
    return this.http
      .post<any>(
        `${this.apiUrl}/login`,
        { username, password },
        {
          headers: this.httpOptions.headers,
          withCredentials: true,
        }
      )
      .pipe(
        tap((response) => {
          console.log("Login successful", response);
        }),
        switchMap(() => this.fetchCurrentUser())
      );
  }

  logout() {
    return this.http.post(`${this.apiUrl}/logout`, {}, this.getOptions).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(["/login"]).then(() => location.reload());
      }),
      catchError((err) => {
        this.currentUserSubject.next(null);
        this.router.navigate(["/login"]);
        return of(null);
      })
    );
  }

  fetchCurrentUser(): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/me`, this.getOptions).pipe(
      tap((user) => {
        this.currentUserSubject.next(user);
      }),
      catchError((error) => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  updateUser(body: User) {
    return this.http.put(
      `${this.apiUrl}/users/${body.id}`,
      body,
      this.httpOptions
    );
  }

  getUser(username): Observable<User> {
    return this.http.get<User>(
      `${this.apiUrl}/users/${username}`,
      this.getOptions
    );
  }

  deleteTask(id: string) {
    return this.http.delete(
      `${this.apiUrl}/tasks/${id}`,
      this.getOptions
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/forgot-password`,
      { email },
      this.publicHttpOptions
    );
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/reset-password`,
      { token, password },
      this.publicHttpOptions
    );
  }
}