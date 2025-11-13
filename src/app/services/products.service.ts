import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { Product } from "../../shared/models/product.model";

@Injectable()
export class ProductsService {
  constructor(private http: HttpClient) {}

  options = {
    headers: new HttpHeaders({ "Content-Type": "application/json" }),
  };

  createProduct(body: Product) {
    return this.http.post("http://localhost:3000/products", body, this.options);
  }

  getProducts(searchTerm?: string): Observable<Product[]> {
    let params = new HttpParams();

    if (searchTerm && searchTerm.trim() !== "") {
      params = params.set("search", searchTerm);
    }
    return this.http.get<Product[]>("http://localhost:3000/products", {
      params,
    });
  }

  updateProduct(id: string, newBody: Product) {
    return this.http.put(
      "http://localhost:3000/products",
      { id, newBody },
      this.options
    );
  }

  deleteProduct(id: string) {
    return this.http.delete(
      `http://localhost:3000/products/${id}`,
      this.options
    );
  }

  logInteraction(
    productId: string,
    interactionType: "view" | "like" | "purchase"
  ): Observable<any> {
    return this.http.post(`http://localhost:3000/interactions`, {
      productId,
      interactionType,
    });
  }

  getUserHistory(): Observable<any> {
    return this.http.get(`http://localhost:3000/interactions/history`);
  }

  getRecommendations(): Observable<Product[]> {
    return this.http.get<Product[]>(`http://localhost:3000/recommendations`);
  }
}
