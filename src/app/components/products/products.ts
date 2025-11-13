import { Component, OnDestroy, OnInit } from "@angular/core";
import { ProductsService } from "../../services/products.service";
import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  Subscription,
  switchMap,
  takeUntil,
} from "rxjs";
import { Product } from "src/shared/models/product.model";
import { UserService } from "src/app/services/user.service";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { Category } from "src/shared/enums/category.enum";
import { HttpParams } from "@angular/common/http";

@Component({
  selector: "products",
  templateUrl: "./products.html",
  styleUrl: "./products.css",
})
export class ProductsComponent implements OnInit, OnDestroy {
  private _destroyed$ = new Subject<void>();
  public products: Product[] = [];
  public productForm: FormGroup;
  public isAdmin: boolean = false;
  public categories = Object.keys(Category)
    .filter((key) => isNaN(Number(key)))
    .map((key) => ({
      value: Category[key as keyof typeof Category],
      label: key,
    }));
  public recommendations: Product[] = [];
  public searchControl = new FormControl("");

  constructor(
    private _productService: ProductsService,
    private _userService: UserService,
    private _fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.getProducts();
    this.getRecommendations();
    this._productService
      .getUserHistory()
      .subscribe((history) => console.log(history));

    this._userService.currentUser$
      .pipe(takeUntil(this._destroyed$))
      .subscribe((result: any) => {
        console.log(result);
        this.isAdmin = result.isAdmin;
      });

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string | null) =>
          this._productService.getProducts(term || "")
        ),
        takeUntil(this._destroyed$)
      )
      .subscribe((products) => {
        this.products = products;
      });

    this.productForm = this._fb.group({
      name: ["", Validators.required],
      description: ["", Validators.required],
      category: ["", Validators.required],
      price: ["", Validators.required],
    });
  }

  public getProducts(term?: string) {
    this._productService.getProducts(term).subscribe((products) => {
      this.products = products;
      console.log(products);
    });
  }

  public getRecommendations() {
    this._productService.getRecommendations().subscribe({
      next: (products) => {
        this.recommendations = products;
        console.log("Recommendations:", products);
      },
      error: (err) => {
        console.error("Error fetching recommendations", err);
      },
    });
  }

  get f() {
    return this.productForm.controls;
  }

  public onSubmit() {
    this._productService
      .createProduct({
        name: this.productForm.get("name").value,
        description: this.productForm.get("description").value,
        category: this.productForm.get("category").value,
        price: this.productForm.get("price").value,
      })
      .subscribe({
        next: (res) => {
          console.log(res);
          alert("Product was successfully added");
          this.productForm.reset();
          this.getProducts();
        },
        error: (err) => {
          alert(err.message);
        },
      });
  }

  onLike(productId: string) {
    this._productService.logInteraction(productId, "like").subscribe({
      next: () => console.log("Product liked!"),
      error: (err) => console.error("Error liking product", err),
    });
  }

  onView(productId: string) {
    this._productService.logInteraction(productId, "view").subscribe({
      next: () => console.log("Product viewed!"),
      error: (err) => console.error("Error viewing product", err),
    });
  }

  onPurchase(productId: string) {
    this._productService.logInteraction(productId, "purchase").subscribe({
      next: () => console.log("Product purchased!"),
      error: (err) => console.error("Error purchasing product", err),
    });
  }

  ngOnDestroy(): void {
    this._destroyed$.next();
    this._destroyed$.complete();
  }
}
