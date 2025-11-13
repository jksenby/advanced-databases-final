import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ProductsService } from "../../services/products.service";

@Component({
  selector: "products-detail",
  templateUrl: "./products-detail.component.html",
  styleUrl: "./products-detail.component.css",
})
export class ProductsDetailComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private productService: ProductsService
  ) {}
  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get("id");
    if (productId) {
      this.productService.logInteraction(productId, "view").subscribe();
    }
  }
}
