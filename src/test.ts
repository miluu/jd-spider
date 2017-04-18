export default class Test {
  constructor (public name: string) {
  }
  say () {
    console.log(`My name is ${this.name}`);
  }
}
