export class A {
  constructor(public name: string) {
  }
}

export class AA extends A {
  constructor(name: string) {
    super(name);
  }
  say () {
    console.log(`My Name is ${this.name}.`);
  }
}
