import { Component, OnInit } from "@angular/core";
import { UserService } from "src/app/services/user.service";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
})
export class HeaderComponent implements OnInit {
  signed = {
    icon: "login",
    route: "/authorization/login",
    toolkip: "Sign in",
  };

  constructor(private userService: UserService) {}
  ngOnInit(): void {
    this.userService.currentUser$.subscribe((res) => {
      if (res) {
        this.signed = {
          icon: "account_box",
          route: "/profile/" + res.username,
          toolkip: "profile",
        };
      }
    });
  }
}
