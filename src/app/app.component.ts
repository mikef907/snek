import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { interval, Subscription, fromEvent, merge, Observable } from 'rxjs';
import { throttle } from 'rxjs/operators';


@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  @ViewChild('canvas', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;

  private readonly canvasWidth = 250;
  private readonly canvasHeight = 250;
  private readonly initGameSpd = 200;
  private readonly initSnakeLength = 1;

  private ctx: CanvasRenderingContext2D;
  private snake: Snake;
  private food: Food;
  private state = { snakeLength: this.initSnakeLength, gameSpeed: this.initGameSpd };

  $game: Subscription;
  $move: Observable<Event>;
  message: string;

  ngOnInit() {
    this.$move = fromEvent(document, 'keydown').pipe(throttle(ev => interval(this.state.gameSpeed)));
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx.canvas.width = this.canvasWidth;
    this.ctx.canvas.height = this.canvasHeight;
    this.startGame();
  }

  startGame() {
    this.message = null;
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.food = new Food(this.ctx);
    this.snake = new Snake(this.ctx, this.food);
    this.food.spawn([{ x: 200, y: 200 }]);
    this.state.gameSpeed = this.initGameSpd;
    this.state.snakeLength = this.initSnakeLength;
    this.setGameSpd(this.state.gameSpeed);
  }

  setGameSpd(spd: number) {
    if (this.$game) {
      this.$game.unsubscribe();
    }

    this.$game = merge(this.$move, interval(spd)).subscribe(res => {
      if (res instanceof Event) {
        this.snake.move(res as KeyboardEvent);
      } else if (!this.snake.animate()) {
        this.message = `Your snek ded, length ${this.snake.Length}`;
        this.$game.unsubscribe();
      } else if (this.state.snakeLength !== this.snake.Length) {
        // MAKE IT GO FASTER
        this.state.gameSpeed -= Math.floor(this.state.gameSpeed * 0.1);
        this.state.snakeLength = this.snake.Length;
        this.setGameSpd(this.state.gameSpeed);
      }
    });
  }
}

export class Food {
  public lifespan = 100;
  private size = 10;
  private color = 'green';
  private x: number;
  private y: number;

  get X() {
    return this.x;
  }
  get Y() {
    return this.y;
  }

  constructor(private ctx: CanvasRenderingContext2D) {}

  clear() {
    this.ctx.clearRect(this.x, this.y, this.size, this.size);
  }

  spawn(body: [{ x: number; y: number }]) {
    this.lifespan = 100;
    // Prevent food from spawning on body
    do {
      this.x = Math.ceil((Math.random() * this.ctx.canvas.width - this.size) / this.size) * this.size;
      this.y = Math.ceil((Math.random() * this.ctx.canvas.height - this.size) / this.size) * this.size;
    } while (body.some(pos => pos.x === this.x && pos.y === this.y));
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

export class Snake {
  private size = 10;
  private color = 'red';
  private x: number;
  private y: number;
  private xv: number;
  private yv: number;
  private body: [{ x: number; y: number }];

  get Length() {
    return this.body.length;
  }

  constructor(private ctx: CanvasRenderingContext2D, private food: Food) {
    this.x = 200;
    this.y = 200;
    this.xv = 1;
    this.yv = 0;
    this.body = [{ x: this.x, y: this.y }];
  }

  private draw(x: number, y: number) {
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(x, y, this.size, this.size);
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(x + 1, y + 1, this.size - 2, this.size - 2);
  }

  animate(): boolean {
    // wrap edges or move around
    if (this.x >= this.ctx.canvas.width) {
      this.x = 0;
    } else if (this.x < 0) {
      this.x = this.ctx.canvas.width - this.size;
    } else if (this.y >= this.ctx.canvas.height) {
      this.y = 0;
    } else if (this.y < 0) {
      this.y = this.ctx.canvas.height - this.size;
    } else {
      this.x += this.xv * this.size;
      this.y += this.yv * this.size;
    }

    const move = { x: this.x, y: this.y };
    if (this.body.some(pos => pos.x === move.x && pos.y === move.y)) {
      // You ded
      return false;
    } else {
      this.body.push(move);
    }

    if (move.x !== this.food.X || move.y !== this.food.Y) {
      const prev = this.body.shift();
      this.ctx.clearRect(prev.x, prev.y, this.size, this.size);
      this.ctx.clearRect(prev.x, prev.y, this.size, this.size);

      // Random chance to respawn food cause why not
      // Is this 10% change after 50 ticks?  Doesn't feel like it...
      if (this.food.lifespan-- < 50 && Math.random() < 0.1 || this.food.lifespan === 0) {
        this.food.clear();
        this.food.spawn(this.body);
      }
    } else {
      // eat...don't shift tail... body grows +1
      this.food.spawn(this.body);
    }

    this.body.forEach(segment => this.draw(segment.x, segment.y));
    return true;
  }

  move(event: KeyboardEvent) {
    switch (event.key) {
      case 'w':
      case 'ArrowUp':
        if (this.yv !== 1) {
          this.yv = -1;
          this.xv = 0;
        }
        break;
      case 'a':
      case 'ArrowLeft':
        if (this.xv !== 1) {
          this.yv = 0;
          this.xv = -1;
        }
        break;
      case 's':
      case 'ArrowDown':
        if (this.yv !== -1) {
          this.yv = 1;
          this.xv = 0;
        }
        break;
      case 'd':
      case 'ArrowRight':
        if (this.xv !== -1) {
          this.yv = 0;
          this.xv = 1;
        }
        break;
      default:
        return;
    }
  }
}