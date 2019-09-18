import { uuid } from './uuid';

const MAX = 1024 * 1024; // 5Mb -> 1Mb

const ls = window.localStorage;

interface Package {
  readonly key: string;
  readonly value: string;
  readonly idx: number;
  readonly length: number;
  readonly next: string;
}

/**
 * 安全的大数据存储 localStorage 的包装
 */
class LargeLocalstorage {

  get length(): number {
    return 0;
  }

  /**
   * 该方法接受一个数值 n 作为参数，并返回存储中的第 n 个键名。
   */
  key(n: number): string {
    return ls.key(n);
  }

  /**
   * 该方法接受一个键名作为参数，返回键名对应的值。
   */
  getItem(k: string): string {
    const key = this.generateKey(k);
    const value = ls.getItem(key);

    if (!value) return value;

    const values: string[] = [];

    let pkg: Package = JSON.parse(value);
    values.push(pkg.value);

    while (pkg.next) {
      pkg = JSON.parse(ls.getItem(pkg.next));
      values.push(pkg.value);
    }

    // 合并起来
    return values.join('');
  }

  /**
   * 该方法接受一个键名和值作为参数，将会把键值对添加到存储中，如果键名存在，则更新其对应的值。
   */
  setItem(k: string, v: any) {
    // 先清除
    this.removeItem(k);

    const packages = this.packages(k, v);

    // 循环存储
    packages.forEach((p: Package) => {
      ls.setItem(p.key, JSON.stringify(p));
    });
  }

  /**
   * 该方法接受一个键名作为参数，并把该键名从存储中删除。
   */
  removeItem(k: string) {
    let next = this.generateKey(k);

    while (next) {
      const value = ls.getItem(next);
      ls.removeItem(next);

      // 如果出错，说明不正确
      try {
        next = (JSON.parse(value) as Package).next;
      } catch (e) {
        return;
      }
    }
  }

  /**
   * 调用该方法会清空存储中的所有键名。
   */
  clear() {
    ls.clear();
  }

  private toString(v) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    return v.toString();
  }

  /**
   * 生成键值
   * @param key
   * @param id
   */
  private generateKey(key: string, id?: string) {
    return `lls:${key}${id ? '-' + id : ''}`;
  }

  /**
   * 拆分字符串
   * @param value
   */
  private sliceValue(value: string): string[] {
    const r = [];

    do {
      r.push(value.slice(0, MAX));
      value = value.slice(MAX);
    } while (value.length > 0);

    return r;
  }

  private packages(k: string, v: any): Package[] {
    const values = this.sliceValue(this.toString(v));
    const length = values.length;

    const uuidArray = values.map(() => uuid());
    global.console.log(uuidArray);

    return values.map((value, idx) => {
      // 第一个 id 不变
      const key = idx === 0 ? this.generateKey(k) : this.generateKey(k, uuidArray[idx]);
      const next = idx >= length - 1 ? undefined : this.generateKey(k, uuidArray[idx + 1]);

      return {
        key,
        value,
        idx,
        length,
        next,
      };
    });
  }
}

export default new LargeLocalstorage();
