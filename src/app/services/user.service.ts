import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
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

  // Create a public observable for components to subscribe to
  public currentUser$ = this.currentUserSubject.asObservable();
  constructor(private http: HttpClient, private router: Router) {}

  options = {
    headers: new HttpHeaders({ "Content-Type": "application/json" }),
  };

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  createUser(body): Observable<User | any> {
    return this.http.post<User | any>(
      `${this.apiUrl}/users`,
      body,
      this.options
    );
  }

  login(username, password): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, { username, password }, this.options)
      .pipe(
        tap((response) => {
          if (response && response.token) {
            localStorage.setItem("token", response.token);
            console.log("Token set in localStorage:", response.token);
          } else {
            console.error("No token found in login response");
          }
        }),
        switchMap(() => this.fetchCurrentUser())
      );
  }

  logout() {
    localStorage.removeItem("token");
    this.currentUserSubject.next(null);
    this.router.navigate(["/login"]);
  }

  fetchCurrentUser(): Observable<User | null> {
    const token = this.getToken();
    if (!token) {
      this.currentUserSubject.next(null);
      return of(null);
    }

    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUserSubject.next(user);
      }),
      catchError((error) => {
        console.error("Failed to fetch user", error);
        this.logout();
        return of(null);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem("token");
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  updateUser(body: User) {
    return this.http.put(`${this.apiUrl}/users/${body.id}`, body, this.options);
  }

  getUser(username): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${username}`);
  }

  deleteTask(id: string) {
    return this.http.delete(`${this.apiUrl}/tasks/${id}`, this.options);
  }
}
