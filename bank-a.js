/* ===========================================================
   C 语言闯关 · 题库 第一部分（第 1 ~ 5 章）
   t: 'output' 预测输出 | 'choice' 概念选择 | 'bug' 点出出错的行
   a: 正确答案下标（bug 题里是 0 起的行号）
   =========================================================== */
(function (root) {
  const R = String.raw;
  const CQ = root.CQ || (root.CQ = []);

  CQ.push(
    /* ---------------- 第 1 章 变量与类型 ---------------- */
    {
      id: 'ch1',
      name: '变量与类型',
      icon: '📦',
      desc: 'int / float / char 与格式化输出',
      qs: [
        {
          t: 'output',
          q: '这段程序会打印什么？',
          code: R`#include <stdio.h>

int main(void) {
    printf("%d\n", 7 / 2);
    return 0;
}`,
          opts: ['3.5', '4', '2', '3'],
          a: 3,
          why: '整数除以整数，结果还是整数：小数部分被直接丢掉（不是四舍五入），所以 7 / 2 = 3。想让结果带小数，至少有一边要是浮点数，比如 7 / 2.0。'
        },
        {
          t: 'output',
          q: '把 2 换成 2.0 之后呢？',
          code: R`#include <stdio.h>

int main(void) {
    printf("%.2f\n", 7 / 2.0);
    return 0;
}`,
          opts: ['3.5', '3', '3.50', '3.00'],
          a: 2,
          why: '7 是 int、2.0 是 double，混合运算时 int 会先被提升成 double，于是做的是浮点除法，得 3.5。%.2f 表示保留两位小数，所以打印 3.50。'
        },
        {
          t: 'output',
          q: '字符其实也是整数。这里打印什么？',
          code: R`#include <stdio.h>

int main(void) {
    char c = 'A' + 1;
    printf("%c\n", c);
    return 0;
}`,
          opts: ['66', 'B', 'A1', 'A'],
          a: 1,
          why: "'A' 的值是 65，加 1 得 66。赋给 char 后用 %c 按字符打印，66 对应的字符就是 'B'。若用 %d 打印，就会输出数字 66。"
        },
        {
          t: 'output',
          q: '把小数赋给 int 变量，会怎样？',
          code: R`#include <stdio.h>

int main(void) {
    int x = 3.9;
    printf("%d\n", x);
    return 0;
}`,
          opts: ['3', '4', '3.9', '0'],
          a: 0,
          why: '把 double 赋给 int 会截断小数部分，是朝零取整而不是四舍五入，所以 3.9 变成 3。真要四舍五入得自己写 (int)(x + 0.5)。'
        },
        {
          t: 'output',
          q: '无符号字符装不下 256，会发生什么？',
          code: R`#include <stdio.h>

int main(void) {
    unsigned char c = 255;
    c = c + 1;
    printf("%d\n", c);
    return 0;
}`,
          opts: ['256', '255', '-1', '0'],
          a: 3,
          why: 'unsigned char 只能存 0 ~ 255。255 + 1 = 256 超范围，按模 256 回绕成 0。整型溢出是 C 里最阴的 bug 之一，算之前先想想结果会不会越界。'
        },
        {
          t: 'choice',
          q: '下面哪个变量名在 C 里是**不合法**的？',
          code: R`#include <stdio.h>

int main(void) {
    int 2nd = 1;
    return 0;
}`,
          opts: ['my_age', '_count', '2nd', 'totalScore'],
          a: 2,
          why: '标识符只能由字母、数字、下划线组成，而且不能以数字开头，所以 2nd 非法。其余三个都合法；另外 int、return 这类关键字也不能拿来当变量名。'
        },
        {
          t: 'bug',
          q: '这段代码编译不过。点出出问题的那一行：',
          code: R`#include <stdio.h>

int main(void) {
    int a = 1
    printf("%d\n", a);
    return 0;
}`,
          a: 3,
          expectLine: 'int a = 1',
          why: '第 4 行 int a = 1 后面少了分号。C 用分号结束语句。要注意编译器往往是在下一行才报错，所以看报错信息时，真正的错常常在上一行结尾。'
        }
      ]
    },

    /* ---------------- 第 2 章 运算符与表达式 ---------------- */
    {
      id: 'ch2',
      name: '运算符与表达式',
      icon: '➕',
      desc: '优先级、自增、取模、位运算',
      qs: [
        {
          t: 'output',
          q: '先乘除后加减，这里打印什么？',
          code: R`#include <stdio.h>

int main(void) {
    int a = 2, b = 3, c = 4;
    printf("%d\n", a + b * c);
    return 0;
}`,
          opts: ['20', '24', '14', '9'],
          a: 2,
          why: '乘法优先级高于加法，先算 b * c = 12，再加上 a = 2，得到 14。想先加就必须写括号 (a + b) * c。'
        },
        {
          t: 'output',
          q: 'a++ 和 ++a 差在哪？',
          code: R`#include <stdio.h>

int main(void) {
    int a = 5;
    int b = a++;
    int c = ++a;
    printf("%d %d %d\n", a, b, c);
    return 0;
}`,
          opts: ['7 6 6', '7 5 7', '6 5 7', '5 6 7'],
          a: 1,
          why: 'a++ 是"先用后加"：b 拿到 5，然后 a 变成 6。++a 是"先加后用"：a 先变成 7，c 才拿到 7。所以最终 a=7、b=5、c=7。'
        },
        {
          t: 'output',
          q: '负数取模，符号跟谁走？',
          code: R`#include <stdio.h>

int main(void) {
    printf("%d\n", -10 % 3);
    return 0;
}`,
          opts: ['-1', '1', '-3', '0'],
          a: 0,
          why: 'C99 起规定：% 的结果符号跟随被除数，所以 -10 % 3 = -1。想让余数永远非负，写 ((-10 % 3) + 3) % 3。'
        },
        {
          t: 'output',
          q: '&& 的短路规则：右边还会执行吗？',
          code: R`#include <stdio.h>

int main(void) {
    int i = 0;
    int x = (i++ && 0);
    printf("%d %d\n", i, x);
    return 0;
}`,
          opts: ['0 0', '1 1', '0 1', '1 0'],
          a: 3,
          why: '&& 左边为假就短路，右边的 0 根本不会被求值。但左边的 i++ 已经执行过了，所以 i = 1；整个表达式为假，x = 0。'
        },
        {
          t: 'output',
          q: '按位运算，三个结果依次是什么？',
          code: R`#include <stdio.h>

int main(void) {
    printf("%d %d %d\n", 5 & 3, 5 | 3, 5 ^ 3);
    return 0;
}`,
          opts: ['7 1 6', '1 6 7', '1 7 6', '5 3 6'],
          a: 2,
          why: '5 = 101，3 = 011，逐位计算：与 & 得 001 = 1，或 | 得 111 = 7，异或 ^（不同为 1）得 110 = 6。'
        },
        {
          t: 'choice',
          q: '表达式 3 > 2 的值是什么？',
          code: R`#include <stdio.h>

int main(void) {
    printf("%d\n", 3 > 2);
    return 0;
}`,
          opts: ['真', '1', '3', '0'],
          a: 1,
          why: 'C 的关系运算结果就是一个 int：真为 1，假为 0。所以 printf("%d", 3 > 2) 打印 1。也正因如此，可以写 printf("%d", (1 < 2) + (3 > 4))，结果是 1。'
        },
        {
          t: 'bug',
          q: '这段代码能编译，但行为和你想的不一样。点出出问题的那一行：',
          code: R`#include <stdio.h>

int main(void) {
    int a = 3;
    if (a = 0) {
        printf("zero\n");
    } else {
        printf("not zero\n");
    }
    return 0;
}`,
          a: 4,
          expectLine: 'if (a = 0)',
          why: 'if (a = 0) 是赋值不是比较：a 被改成 0，整个表达式的值就是 0（假），于是走 else。想比较必须写 a == 0。编译器一般会给警告，别忽略它。'
        }
      ]
    },

    /* ---------------- 第 3 章 分支结构 ---------------- */
    {
      id: 'ch3',
      name: '分支结构',
      icon: '🔀',
      desc: 'if / else / switch 与常见陷阱',
      qs: [
        {
          t: 'output',
          q: '0 在 C 里代表什么？',
          code: R`#include <stdio.h>

int main(void) {
    int x = 0;
    if (x)
        printf("A\n");
    else
        printf("B\n");
    return 0;
}`,
          opts: ['A', 'B', 'AB', '编译错误'],
          a: 1,
          why: 'C 里 0 是假，任何非 0 都是真。x = 0 为假，走 else 打印 B。条件里可以直接放整数，不需要写 x == 0 这种比较。'
        },
        {
          t: 'output',
          q: '这个 else 到底属于哪个 if？',
          code: R`#include <stdio.h>

int main(void) {
    int a = 3;
    if (a > 1)
        if (a > 5)
            printf("X\n");
        else
            printf("Y\n");
    return 0;
}`,
          opts: ['Y', 'X', '什么都不打印', '编译错误'],
          a: 0,
          why: 'else 永远和最近的、还没配对的 if 配对，所以它属于内层 if (a > 5)。a = 3 满足 a > 1、不满足 a > 5，于是打印 Y。想改变归属就加大括号。'
        },
        {
          t: 'output',
          q: '漏写 break 会怎样？',
          code: R`#include <stdio.h>

int main(void) {
    int n = 2;
    switch (n) {
        case 1: printf("one ");
        case 2: printf("two ");
        case 3: printf("three ");
        default: printf("other");
    }
    printf("\n");
    return 0;
}`,
          opts: ['two', 'three other', 'one two three other', 'two three other'],
          a: 3,
          why: 'case 只是"入口标签"，匹配到 case 2 后如果没有 break，就会一路穿透执行后面所有语句，连 default 也不放过。这就是经典的 fallthrough 陷阱。'
        },
        {
          t: 'output',
          q: '多个 case 共用一个分支，合法吗？',
          code: R`#include <stdio.h>

int main(void) {
    char grade = 'A';
    switch (grade) {
        case 'A':
        case 'B':
            printf("good\n");
            break;
        case 'C':
            printf("pass\n");
            break;
        default:
            printf("fail\n");
    }
    return 0;
}`,
          opts: ['pass', 'fail', 'good', '编译错误'],
          a: 2,
          why: "case 'A' 后面没有语句，会直接落到 case 'B' 的 printf 上，于是 A 和 B 共用同一个分支。这是 C 里合法的写法，也是最推荐的穿透用法。"
        },
        {
          t: 'output',
          q: 'else if 链条怎么走？',
          code: R`#include <stdio.h>

int main(void) {
    int score = 75;
    if (score >= 90)
        printf("A\n");
    else if (score >= 60)
        printf("B\n");
    else
        printf("C\n");
    return 0;
}`,
          opts: ['A', 'B', 'C', 'BC'],
          a: 1,
          why: '从上往下逐个判断，第一个为真的分支执行后，后面的分支全部跳过。75 不满足 >= 90，但满足 >= 60，所以打印 B，不会再去判断 else。'
        },
        {
          t: 'choice',
          q: '想判断 n 是不是偶数，正确写法是？',
          code: R`#include <stdio.h>

int main(void) {
    int n = 8;
    if ( /* 这里填什么？ */ )
        printf("even\n");
    return 0;
}`,
          opts: ['n % 2 == 0', 'n / 2 == 0', 'n % 2 = 0', 'n % 2 == 1'],
          a: 0,
          why: '偶数就是除以 2 余 0，所以 n % 2 == 0。比较必须用 ==，写成 n % 2 = 0 是赋值，而且左边不是可赋值的"左值"，编译器会直接报错。'
        },
        {
          t: 'bug',
          q: '这段代码逻辑错了：a = 15 却打印 in range。点出问题所在的行：',
          code: R`#include <stdio.h>

int main(void) {
    int a = 15;
    if (0 < a < 10)
        printf("in range\n");
    else
        printf("out of range\n");
    return 0;
}`,
          a: 4,
          expectLine: '0 < a < 10',
          why: 'C 里 0 < a < 10 是从左到右算的：(0 < a) 得到 1，再判断 1 < 10 得到 1，永远为真。正确写法是 a > 0 && a < 10。数学式子和 C 表达式不是一回事。'
        }
      ]
    },

    /* ---------------- 第 4 章 循环 ---------------- */
    {
      id: 'ch4',
      name: '循环',
      icon: '🔁',
      desc: 'for / while / do-while 与边界',
      qs: [
        {
          t: 'output',
          q: '1 加到 5，结果是多少？',
          code: R`#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 5; i++)
        sum += i;
    printf("%d\n", sum);
    return 0;
}`,
          opts: ['15', '10', '14', '21'],
          a: 0,
          why: 'i 依次是 1、2、3、4、5，累加得 15。如果把条件写成 i < 5，就只加 4 项得 10——循环边界差一是初学者最常见的错误。'
        },
        {
          t: 'output',
          q: 'continue 会跳过什么？',
          code: R`#include <stdio.h>

int main(void) {
    int i;
    for (i = 0; i < 6; i++) {
        if (i % 2 == 0)
            continue;
        printf("%d", i);
    }
    printf("\n");
    return 0;
}`,
          opts: ['024', '12345', '0245', '135'],
          a: 3,
          why: 'continue 跳过本轮剩下的语句，直接进入下一轮。i 是偶数时被跳过，只打印 1、3、5。注意 for 里的 i++ 依然会执行，所以不会死循环。'
        },
        {
          t: 'output',
          q: 'break 又跳到哪里？',
          code: R`#include <stdio.h>

int main(void) {
    int i;
    for (i = 0; i < 10; i++) {
        if (i == 3)
            break;
        printf("%d", i);
    }
    printf("\n");
    return 0;
}`,
          opts: ['0123', '3', '012', '0123456789'],
          a: 2,
          why: 'break 直接跳出整个循环。i 走到 3 时条件成立，立刻结束循环，所以只打印了 0、1、2。continue 是"跳过本轮"，break 是"整个不干了"。'
        },
        {
          t: 'output',
          q: 'do-while 的条件一开始就不成立，循环体会执行吗？',
          code: R`#include <stdio.h>

int main(void) {
    int i = 10;
    do {
        printf("%d ", i);
        i++;
    } while (i < 3);
    printf("\n");
    return 0;
}`,
          opts: ['', '10', '10 11 12', '无限循环'],
          a: 1,
          why: 'do-while 先执行一次再判断条件，所以哪怕 i = 10 一开始就不满足 i < 3，循环体也会跑一次，打印一次 10。这就是它和 while 最本质的区别。'
        },
        {
          t: 'output',
          q: '两层循环一共转多少次？',
          code: R`#include <stdio.h>

int main(void) {
    int count = 0;
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 4; j++)
            count++;
    printf("%d\n", count);
    return 0;
}`,
          opts: ['12', '7', '3', '4'],
          a: 0,
          why: '外层每转 1 次，内层转满 4 次，共 3 × 4 = 12 次。嵌套循环的总次数 = 外层次数 × 内层次数。'
        },
        {
          t: 'choice',
          q: 'for (;;) 表示什么？',
          code: R`#include <stdio.h>

int main(void) {
    int i = 0;
    for (;;) {
        if (++i > 3) break;
        printf("%d ", i);
    }
    printf("\n");
    return 0;
}`,
          opts: ['语法错误', '循环 0 次', '循环 1 次', '死循环'],
          a: 3,
          why: 'for 的三个部分都可省略：没初始化、条件省略视为恒真、没步进，所以是死循环，等价于 while (1)。通常配合 break 在内部跳出。'
        },
        {
          t: 'bug',
          q: '这段代码会卡死。点出问题所在的行：',
          code: R`#include <stdio.h>

int main(void) {
    int i = 1, sum = 0;
    while (i <= 5);
    {
        sum += i;
        i++;
    }
    printf("%d\n", sum);
    return 0;
}`,
          a: 4,
          expectLine: 'while (i <= 5);',
          why: 'while 后面多了一个分号，循环体变成了空语句 ;，i 永远不变，循环永远停不下来。写 while/for 时括号后别手滑加分号——这是真实项目里也会犯的错。'
        }
      ]
    },

    /* ---------------- 第 5 章 数组 ---------------- */
    {
      id: 'ch5',
      name: '数组',
      icon: '🗂️',
      desc: '下标、初始化、sizeof、越界',
      qs: [
        {
          t: 'output',
          q: '只初始化前 3 个元素，后面是什么？',
          code: R`#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3};
    printf("%d\n", a[3]);
    return 0;
}`,
          opts: ['随机值', '3', '编译错误', '0'],
          a: 3,
          why: '用 {…} 部分初始化时，剩下的元素会自动补 0，所以 a[3] = 0、a[4] = 0。注意这跟"完全不初始化"不一样：int a[5]; 里就是垃圾值了。'
        },
        {
          t: 'output',
          q: '怎么算数组有多少个元素？',
          code: R`#include <stdio.h>

int main(void) {
    int a[] = {1, 2, 3, 4};
    printf("%d\n", (int)(sizeof(a) / sizeof(a[0])));
    return 0;
}`,
          opts: ['16', '1', '4', '8'],
          a: 2,
          why: 'sizeof(a) 是整个数组的字节数（16），sizeof(a[0]) 是一个元素的大小（4），相除得元素个数 4。这个技巧只在数组还在当前作用域时有效——数组一旦当参数传进函数就会退化成指针。'
        },
        {
          t: 'output',
          q: '二维数组的下标怎么取？',
          code: R`#include <stdio.h>

int main(void) {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    printf("%d\n", a[1][2]);
    return 0;
}`,
          opts: ['3', '6', '5', '4'],
          a: 1,
          why: '行、列都从 0 开始编号。a[1] 是第二行 {4, 5, 6}，a[1][2] 是这一行的第三列，即 6。'
        },
        {
          t: 'output',
          q: '把数组元素全加起来：',
          code: R`#include <stdio.h>

int main(void) {
    int a[4] = {10, 20, 30, 40};
    int s = 0;
    for (int i = 0; i < 4; i++)
        s += a[i];
    printf("%d\n", s);
    return 0;
}`,
          opts: ['100', '70', '90', '110'],
          a: 0,
          why: '10 + 20 + 30 + 40 = 100。循环条件用 i < 4，因为有效下标是 0 ~ 3。遍历数组时把 4 写死很危险，改成 sizeof(a)/sizeof(a[0]) 更安全。'
        },
        {
          t: 'choice',
          q: 'int a[3]; 的有效下标范围是？',
          code: R`#include <stdio.h>

int main(void) {
    int a[3];
    /* a 的有效下标是？ */
    return 0;
}`,
          opts: ['1、2、3', '0、1、2、3', '任意整数', '0、1、2'],
          a: 3,
          why: 'C 数组下标从 0 开始，n 个元素的下标是 0 ~ n-1，所以 int a[3] 只能用 a[0]、a[1]、a[2]。a[3] 已经越界。'
        },
        {
          t: 'bug',
          q: '这段代码有越界问题。点出出错的那一行：',
          code: R`#include <stdio.h>

int main(void) {
    int a[3];
    for (int i = 0; i <= 3; i++) {
        a[i] = i;
    }
    printf("done\n");
    return 0;
}`,
          a: 4,
          expectLine: 'i <= 3',
          why: '有效下标只有 0 ~ 2，i <= 3 会写到 a[3]，越界了。C 不检查数组越界，多写的那一格可能覆盖掉别的变量，程序可能崩也可能"看起来正常"——这种 bug 最难查。条件应改成 i < 3。'
        },
        {
          t: 'choice',
          q: 'int a[3] = {1, 2, 3, 4}; 会怎样？',
          code: R`#include <stdio.h>

int main(void) {
    int a[3] = {1, 2, 3, 4};
    return 0;
}`,
          opts: ['自动扩容成 4 个元素', '多出来的 4 被丢弃', '编译错误：初始值过多', '运行时崩溃'],
          a: 2,
          why: '数组大小在定义时就定了，{1, 2, 3, 4} 有 4 个初始值塞不进 3 个格子，编译器直接报错（too many initializers）。数量不够会自动补 0，但多了不行。'
        }
      ]
    }
  );
})(typeof globalThis !== 'undefined' ? globalThis : this);
