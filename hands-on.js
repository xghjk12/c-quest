/* ===========================================================
   C 语言闯关 · 实操题库（Hands-on）

   和选择题不同，这里要你自己写代码。每题有：
     task      题目要求
     starter   起手代码（已经搭好架子，留空让你填）
     solution  参考解答（用来生成标准输出 + 给"看答案"用）
     cases     测试用例 [{ in: '标准输入', 必须包含: [...] / 不能包含: [...] }]
     hints     分级提示（从方向到具体）

   标准输出不写死在这里，由 build/gen-hands-on.js 跑参考解答生成。
   =========================================================== */
(function (root) {
  const R = String.raw;
  const HQ = root.HQ || (root.HQ = []);

  HQ.push(
    /* ---------------- 第 1 章 变量与类型 ---------------- */
    {
      id: 'h1',
      ch: '变量与类型',
      title: '交换两个整数',
      level: 1,
      task: '读入两个整数 a 和 b，把它们交换后按 "a b" 的格式输出。',
      detail: '输入：两个整数，空格或换行分隔。\n输出：交换后的两个数，中间一个空格，行尾换行。',
      starter: R`#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);

    /* TODO: 在这里交换 a 和 b */

    printf("%d %d\n", a, b);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int a, b, t;
    scanf("%d %d", &a, &b);
    t = a;
    a = b;
    b = t;
    printf("%d %d\n", a, b);
    return 0;
}`,
      cases: [
        { in: '3 5\n', expect: '5 3\n' },
        { in: '-1 0\n', expect: '0 -1\n' },
        { in: '7 7\n', expect: '7 7\n' }
      ],
      hints: [
        '交换不能直接写 a = b; b = a;，那样 a 的原始值会丢掉。',
        '需要一个临时变量 t 先存住 a 的值。',
        '三行：t = a;  a = b;  b = t;'
      ]
    },

    {
      id: 'h2',
      ch: '变量与类型',
      title: '摄氏度转华氏度',
      level: 1,
      task: '读入一个摄氏温度（整数），输出对应的华氏温度，保留 1 位小数。',
      detail: '公式：F = C × 9 / 5 + 32\n输入：一个整数。\n输出：华氏温度，保留 1 位小数，行尾换行。',
      starter: R`#include <stdio.h>

int main(void) {
    int c;
    scanf("%d", &c);

    double f = 0.0;   /* TODO: 用公式算出 f */

    printf("%.1f\n", f);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int c;
    scanf("%d", &c);
    double f = c * 9.0 / 5.0 + 32;
    printf("%.1f\n", f);
    return 0;
}`,
      cases: [
        { in: '0\n', expect: '32.0\n' },
        { in: '100\n', expect: '212.0\n' },
        { in: '-40\n', expect: '-40.0\n' },
        { in: '37\n', expect: '98.6\n' }
      ],
      hints: [
        '直接把 c * 9 / 5 写成整数运算会丢小数。',
        '把 9 或 5 至少一个写成 9.0 / 5.0，除法才会走浮点。',
        'f = c * 9.0 / 5.0 + 32;'
      ]
    },

    /* ---------------- 第 2 章 运算符 ---------------- */
    {
      id: 'h3',
      ch: '运算符与表达式',
      title: '判断闰年',
      level: 1,
      task: '读入一个年份，闰年输出 "yes"，否则输出 "no"。',
      detail: '闰年规则：能被 4 整除但不能被 100 整除，或者能被 400 整除。\n输入：一个正整数。\n输出：yes 或 no，行尾换行。',
      starter: R`#include <stdio.h>

int main(void) {
    int y;
    scanf("%d", &y);

    int leap = 0;   /* TODO: 判断 y 是不是闰年，是则置 1 */

    if (leap)
        printf("yes\n");
    else
        printf("no\n");
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int y;
    scanf("%d", &y);
    int leap = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
    if (leap)
        printf("yes\n");
    else
        printf("no\n");
    return 0;
}`,
      cases: [
        { in: '2024\n', expect: 'yes\n' },
        { in: '2023\n', expect: 'no\n' },
        { in: '1900\n', expect: 'no\n' },
        { in: '2000\n', expect: 'yes\n' }
      ],
      hints: [
        '规则有两半，中间是「或者」。',
        '能被 4 整除写 y % 4 == 0。',
        'leap = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);'
      ]
    },

    {
      id: 'h4',
      ch: '运算符与表达式',
      title: '不用临时变量交换',
      level: 2,
      task: '读入两个整数，不借助第三个变量，把它们交换后输出。',
      detail: '输入：两个整数。\n输出：交换后的两个数，空格分隔。\n要求：代码里除了 a、b 不能声明别的变量来当中间人。',
      starter: R`#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);

    /* TODO: 只用 a 和 b 完成交换 */

    printf("%d %d\n", a, b);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    a = a + b;
    b = a - b;
    a = a - b;
    printf("%d %d\n", a, b);
    return 0;
}`,
      forbidden: ['t =', 'temp', 'tmp'],   /* 不许用临时变量 */
      cases: [
        { in: '3 5\n', expect: '5 3\n' },
        { in: '100 -7\n', expect: '-7 100\n' }
      ],
      hints: [
        '既然不能存副本，那就把两个数的信息「叠加」进一个数里。',
        '先把和存进 a：a = a + b;  此时 a 里同时含有原来的 a 和 b。',
        'b = a - b;  再把 a 的旧值还回去：a = a - b;'
      ]
    },

    /* ---------------- 第 3 章 分支 ---------------- */
    {
      id: 'h5',
      ch: '分支结构',
      title: '成绩等级',
      level: 1,
      task: '读入一个整数分数（0-100），按区间输出等级。',
      detail: '90 及以上 → A\n60 到 89 → B\n60 以下 → C\n输入：一个整数。\n输出：一个大写字母，行尾换行。',
      starter: R`#include <stdio.h>

int main(void) {
    int s;
    scanf("%d", &s);

    /* TODO: 按分数输出 A / B / C */

    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int s;
    scanf("%d", &s);
    if (s >= 90)
        printf("A\n");
    else if (s >= 60)
        printf("B\n");
    else
        printf("C\n");
    return 0;
}`,
      cases: [
        { in: '95\n', expect: 'A\n' },
        { in: '90\n', expect: 'A\n' },
        { in: '89\n', expect: 'B\n' },
        { in: '60\n', expect: 'B\n' },
        { in: '59\n', expect: 'C\n' },
        { in: '0\n', expect: 'C\n' }
      ],
      hints: [
        '按分数从高到低判断，先问「是不是 >= 90」。',
        'else if 链条里，走到第二个分支说明已经不到 90 了，所以只要写 s >= 60。',
        'if (s >= 90) ... else if (s >= 60) ... else ...'
      ]
    },

    {
      id: 'h6',
      ch: '分支结构',
      title: '简单计算器',
      level: 2,
      task: '读入「数 运算符 数」，输出运算结果。',
      detail: '输入格式：a op b，其中 op 是 + - * / 之一（空格分隔）。\n输出：结果。加减乘输出整数；除法输出保留 2 位小数。\n注意：除法时如果除数是 0，输出 "error"。',
      starter: R`#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    scanf("%d %c %d", &a, &op, &b);

    /* TODO: 用 switch 或 if 处理四种运算 */
    /* 提示：除法的结果要是小数 */

    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    scanf("%d %c %d", &a, &op, &b);

    switch (op) {
        case '+': printf("%d\n", a + b); break;
        case '-': printf("%d\n", a - b); break;
        case '*': printf("%d\n", a * b); break;
        case '/':
            if (b == 0)
                printf("error\n");
            else
                printf("%.2f\n", (double)a / b);
            break;
        default:
            printf("error\n");
    }
    return 0;
}`,
      cases: [
        { in: '3 + 4\n', expect: '7\n' },
        { in: '10 - 25\n', expect: '-15\n' },
        { in: '6 * 7\n', expect: '42\n' },
        { in: '7 / 2\n', expect: '3.50\n' },
        { in: '7 / 0\n', expect: 'error\n' }
      ],
      hints: [
        '读一个字符用 %c，注意前面要有空格跳过空白：scanf("%d %c %d", ...)。',
        '每种运算一个 case，记得写 break。',
        '除法要先判 b == 0，算的时候写 (double)a / b 才不会丢小数。'
      ]
    },

    /* ---------------- 第 4 章 循环 ---------------- */
    {
      id: 'h7',
      ch: '循环',
      title: '1 到 n 求和',
      level: 1,
      task: '读入正整数 n，输出 1 + 2 + ... + n 的和。',
      detail: '输入：一个正整数 n。\n输出：累加和，行尾换行。',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int sum = 0;
    /* TODO: 用循环把 1 到 n 加起来 */

    printf("%d\n", sum);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int sum = 0;
    for (int i = 1; i <= n; i++)
        sum += i;
    printf("%d\n", sum);
    return 0;
}`,
      cases: [
        { in: '1\n', expect: '1\n' },
        { in: '10\n', expect: '55\n' },
        { in: '100\n', expect: '5050\n' }
      ],
      hints: [
        '需要两个东西：一个累加器 sum，一个计数器 i。',
        'for (int i = 1; i <= n; i++) sum += i;',
        '注意条件是 i <= n，写成 i < n 会少加一个 n。'
      ]
    },

    {
      id: 'h8',
      ch: '循环',
      title: '打印乘法表的一行',
      level: 1,
      task: '读入一个整数 n（1-9），打印 n 的乘法口诀这一行。',
      detail: '输出格式：n*1=结果 n*2=结果 ... n*9=结果\n每项之间一个空格，第 9 项后面直接换行，不要多余空格。\n例：输入 3，输出 3*1=3 3*2=6 ... 3*9=27',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    /* TODO: 打印 n*1 到 n*9 */

    printf("\n");
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 1; i <= 9; i++) {
        if (i > 1) printf(" ");
        printf("%d*%d=%d", n, i, n * i);
    }
    printf("\n");
    return 0;
}`,
      cases: [
        { in: '3\n', expect: '3*1=3 3*2=6 3*3=9 3*4=12 3*5=15 3*6=18 3*7=21 3*8=24 3*9=27\n' },
        { in: '9\n', expect: '9*1=9 9*2=18 9*3=27 9*4=36 9*5=45 9*6=54 9*7=63 9*8=72 9*9=81\n' }
      ],
      hints: [
        '循环 9 次，每次打印一项 "n*i=积"。',
        '麻烦在空格：第一项前面不能有空格，最后一项后面不能有空格。',
        '常见写法：if (i > 1) printf(" "); 然后再打印这一项。'
      ]
    },

    {
      id: 'h9',
      ch: '循环',
      title: '倒序输出数字',
      level: 2,
      task: '读入一个非负整数，把它的各位数字倒过来输出成一个数。',
      detail: '输入：一个非负整数 n（可能以 0 结尾，如 1230）。\n输出：倒序后的数（前导零不输出）。\n例：1230 → 321，7 → 7，0 → 0',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int rev = 0;
    /* TODO: 反复取最后一位，拼到 rev 上 */

    printf("%d\n", rev);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int rev = 0;
    do {
        rev = rev * 10 + n % 10;
        n /= 10;
    } while (n > 0);
    printf("%d\n", rev);
    return 0;
}`,
      cases: [
        { in: '1230\n', expect: '321\n' },
        { in: '7\n', expect: '7\n' },
        { in: '0\n', expect: '0\n' },
        { in: '10000\n', expect: '1\n' }
      ],
      hints: [
        '取最后一位：n % 10。去掉最后一位：n /= 10。',
        '每取一位，把 rev 乘 10 再加进去：rev = rev * 10 + n % 10;',
        '这里用 do-while 更自然：n = 0 的时候也要输出一次 0，用 while 会一次都不进循环。'
      ]
    },

    /* ---------------- 第 5 章 数组 ---------------- */
    {
      id: 'h10',
      ch: '数组',
      title: '求最大值和最小值',
      level: 1,
      task: '读入 n 个整数，输出其中的最大值和最小值。',
      detail: '第一行是整数 n，第二行是 n 个整数。\n输出："最大值 最小值"，中间一个空格，行尾换行。',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    /* TODO: 找出最大值和最小值 */

    printf("%d %d\n", 0, 0);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    int mx = a[0], mn = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > mx) mx = a[i];
        if (a[i] < mn) mn = a[i];
    }
    printf("%d %d\n", mx, mn);
    return 0;
}`,
      cases: [
        { in: '5\n3 1 4 1 5\n', expect: '5 1\n' },
        { in: '1\n42\n', expect: '42 42\n' },
        { in: '4\n-5 -2 -9 -1\n', expect: '-1 -9\n' }
      ],
      hints: [
        '先把第一个元素当成当前的最大值、最小值。',
        '从第二个元素开始遍历，遇到更大的就更新 mx，更小的就更新 mn。',
        '注意别把 mx 初始化成 0——如果全是负数，0 就不是元素里的值了。'
      ]
    },

    {
      id: 'h11',
      ch: '数组',
      title: '数组逆置',
      level: 2,
      task: '读入 n 个整数，把它们原地逆序后输出。',
      detail: '输入：第一行 n，第二行 n 个整数。\n输出：逆序后的 n 个数，用一个空格分隔，行尾换行。\n要求：必须真的交换数组里的元素，不能只是倒着打印。',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    /* TODO: 交换 a[0] 和 a[n-1]、a[1] 和 a[n-2] ... */

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    for (int i = 0; i < n / 2; i++) {
        int t = a[i];
        a[i] = a[n - 1 - i];
        a[n - 1 - i] = t;
    }

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");
    return 0;
}`,
      cases: [
        { in: '5\n1 2 3 4 5\n', expect: '5 4 3 2 1\n' },
        { in: '4\n10 20 30 40\n', expect: '40 30 20 10\n' },
        { in: '1\n7\n', expect: '7\n' }
      ],
      hints: [
        '用两个下标：一个从头走，一个从尾走，走到中间为止。',
        '交换 a[i] 和 a[n-1-i]，i 从 0 走到 n/2 之前。',
        '为什么是 n/2？走一半就够了，多走会把刚换好的又换回去。'
      ]
    },

    {
      id: 'h12',
      ch: '数组',
      title: '统计每个数字出现次数',
      level: 3,
      task: '读入 n 个 0-9 之间的数字，输出每个数字出现了几次。',
      detail: '输入：第一行 n，第二行 n 个 0-9 的整数。\n输出：10 行，第 i 行是数字 i 出现的次数，格式 "i:次数"。\n例：输入 5 / 1 3 1 3 1，输出\n0:0\n1:3\n2:0\n3:2\n...\n9:0',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    /* TODO: 用一个大小为 10 的计数数组统计 */

    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    int cnt[10] = {0};
    for (int i = 0; i < n; i++)
        cnt[a[i]]++;

    for (int i = 0; i < 10; i++)
        printf("%d:%d\n", i, cnt[i]);

    return 0;
}`,
      cases: [
        {
          in: '5\n1 3 1 3 1\n',
          expect: '0:0\n1:3\n2:0\n3:2\n4:0\n5:0\n6:0\n7:0\n8:0\n9:0\n'
        },
        {
          in: '3\n0 0 9\n',
          expect: '0:2\n1:0\n2:0\n3:0\n4:0\n5:0\n6:0\n7:0\n8:0\n9:1\n'
        }
      ],
      hints: [
        '计数数组是这类题的万能套路：cnt[10]，下标就是被统计的数字。',
        '读到 x 就让 cnt[x]++ —— 用值当下标，这是数组最有用的一招。',
        '别忘了 int cnt[10] = {0}; 先清零，否则是垃圾值。'
      ]
    },

    /* ---------------- 第 6 章 函数 ---------------- */
    {
      id: 'h13',
      ch: '函数',
      title: '写一个求绝对值的函数',
      level: 1,
      task: '补全函数 abs_int，返回整数的绝对值。',
      detail: 'main 已经写好了，读入一个整数并调用你的函数。\n输入：一个整数（可能是负数）。\n输出：它的绝对值。',
      starter: R`#include <stdio.h>

int abs_int(int x) {
    /* TODO: 返回 x 的绝对值 */
    return 0;
}

int main(void) {
    int n;
    scanf("%d", &n);
    printf("%d\n", abs_int(n));
    return 0;
}`,
      solution: R`#include <stdio.h>

int abs_int(int x) {
    if (x < 0)
        return -x;
    return x;
}

int main(void) {
    int n;
    scanf("%d", &n);
    printf("%d\n", abs_int(n));
    return 0;
}`,
      cases: [
        { in: '5\n', expect: '5\n' },
        { in: '-7\n', expect: '7\n' },
        { in: '0\n', expect: '0\n' }
      ],
      hints: [
        '绝对值就是「负数变正，其他不变」。',
        '判断 x < 0 时返回 -x。',
        '别写成 x = -x; 然后 return x;——也能对，但直接 return -x; 更清楚。'
      ]
    },

    {
      id: 'h14',
      ch: '函数',
      title: '递归求斐波那契',
      level: 2,
      task: '用递归实现 fib(n)，返回斐波那契数列第 n 项。',
      detail: '定义：fib(0)=0, fib(1)=1, fib(n)=fib(n-1)+fib(n-2)。\n输入：一个非负整数 n。\n输出：第 n 项的值。',
      starter: R`#include <stdio.h>

int fib(int n) {
    /* TODO: 递归实现 */
    return 0;
}

int main(void) {
    int n;
    scanf("%d", &n);
    printf("%d\n", fib(n));
    return 0;
}`,
      solution: R`#include <stdio.h>

int fib(int n) {
    if (n <= 1)
        return n;
    return fib(n - 1) + fib(n - 2);
}

int main(void) {
    int n;
    scanf("%d", &n);
    printf("%d\n", fib(n));
    return 0;
}`,
      cases: [
        { in: '0\n', expect: '0\n' },
        { in: '1\n', expect: '1\n' },
        { in: '10\n', expect: '55\n' },
        { in: '20\n', expect: '6765\n' }
      ],
      hints: [
        '递归必须先写「出口」：n 是 0 或 1 的时候直接返回 n。',
        '没有出口会无限递归，栈爆了程序就崩。',
        '出口之后，return fib(n-1) + fib(n-2);'
      ]
    },

    /* ---------------- 第 7 章 指针 ---------------- */
    {
      id: 'h15',
      ch: '指针',
      title: '用指针交换两个数',
      level: 2,
      task: '补全函数 swap，通过指针交换两个整数。',
      detail: 'main 已经写好并调用 swap(&a, &b)。\n输入：两个整数。\n输出：交换后的两个数。',
      starter: R`#include <stdio.h>

void swap(int *pa, int *pb) {
    /* TODO: 交换 *pa 和 *pb */
}

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    swap(&a, &b);
    printf("%d %d\n", a, b);
    return 0;
}`,
      solution: R`#include <stdio.h>

void swap(int *pa, int *pb) {
    int t = *pa;
    *pa = *pb;
    *pb = t;
}

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    swap(&a, &b);
    printf("%d %d\n", a, b);
    return 0;
}`,
      cases: [
        { in: '1 2\n', expect: '2 1\n' },
        { in: '-3 8\n', expect: '8 -3\n' }
      ],
      hints: [
        '参数是指针，所以要操作的是 *pa、*pb，不是 pa、pb。',
        '直接写 pa = pb; 只是改指针本身，外面的变量一点没变。',
        'int t = *pa;  *pa = *pb;  *pb = t;'
      ]
    },

    {
      id: 'h16',
      ch: '指针',
      title: '用指针改数组',
      level: 3,
      task: '补全函数 add_one，把数组里每个元素都加 1。只能用指针，不能用下标。',
      detail: 'main 已经写好了。\n输入：第一行 n，第二行 n 个整数。\n输出：每个数加 1 后的结果，空格分隔。',
      starter: R`#include <stdio.h>

void add_one(int *p, int n) {
    /* TODO: 用指针遍历，把每个元素加 1
       不许写 p[i] 或 *(p+i)，只能用 p++ 这种指针移动 */
}

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    add_one(a, n);

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");
    return 0;
}`,
      solution: R`#include <stdio.h>

void add_one(int *p, int n) {
    int *end = p + n;
    while (p < end) {
        *p = *p + 1;
        p++;
    }
}

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    add_one(a, n);

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");
    return 0;
}`,
      cases: [
        { in: '5\n1 2 3 4 5\n', expect: '2 3 4 5 6\n' },
        { in: '3\n-1 0 9\n', expect: '0 1 10\n' }
      ],
      hints: [
        '指针 p 指向当前元素，*p 就是那个元素。',
        '改值写 *p = *p + 1; 或者 (*p)++; 注意括号不能少。',
        '循环 n 次，每次处理完 p++ 指向下一个。'
      ]
    },

    /* ---------------- 第 8 章 字符串 ---------------- */
    {
      id: 'h17',
      ch: '字符与字符串',
      title: '统计字符个数',
      level: 2,
      task: '读入一行字符串（可能含空格），输出它的长度。不能用 strlen。',
      detail: '输入：一整行（最多 200 字符，不含换行符）。\n输出：字符个数（不含结尾的 \\0），行尾换行。',
      starter: R`#include <stdio.h>

int main(void) {
    char s[201];
    fgets(s, sizeof(s), stdin);

    /* TODO: 自己数有多少个字符（注意 fgets 会把换行也读进来） */

    printf("%d\n", 0);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    char s[201];
    fgets(s, sizeof(s), stdin);

    int len = 0;
    while (s[len] != '\0' && s[len] != '\n')
        len++;

    printf("%d\n", len);
    return 0;
}`,
      cases: [
        { in: 'hello\n', expect: '5\n' },
        { in: 'c language\n', expect: '10\n' },
        { in: 'a\n', expect: '1\n' },
        { in: '\n', expect: '0\n' }
      ],
      hints: [
        '用循环从下标 0 往后走，直到遇到 \\0 为止，走一步计数加一。',
        'fgets 会把行尾的换行符也读进数组，所以数到 \\n 也得停。',
        'while (s[len] != \'\\0\' && s[len] != \'\\n\') len++;'
      ]
    },

    {
      id: 'h18',
      ch: '字符与字符串',
      title: '把字符串倒过来',
      level: 3,
      task: '读入一行字符串，把它反转后输出。',
      detail: '输入：一整行（可能含空格）。\n输出：反转后的字符串，行尾换行。\n要求：交换数组里的字符，不能只是倒着打印。',
      starter: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char s[201];
    fgets(s, sizeof(s), stdin);

    /* 先去掉末尾可能的换行符 */
    int len = (int)strlen(s);
    if (len > 0 && s[len - 1] == '\n') {
        s[len - 1] = '\0';
        len--;
    }

    /* TODO: 原地反转 s 的前 len 个字符 */

    printf("%s\n", s);
    return 0;
}`,
      solution: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char s[201];
    fgets(s, sizeof(s), stdin);

    int len = (int)strlen(s);
    if (len > 0 && s[len - 1] == '\n') {
        s[len - 1] = '\0';
        len--;
    }

    for (int i = 0; i < len / 2; i++) {
        char t = s[i];
        s[i] = s[len - 1 - i];
        s[len - 1 - i] = t;
    }

    printf("%s\n", s);
    return 0;
}`,
      cases: [
        { in: 'abc\n', expect: 'cba\n' },
        { in: 'hello world\n', expect: 'dlrow olleh\n' },
        { in: 'x\n', expect: 'x\n' }
      ],
      hints: [
        '和数组逆置一模一样，只不过元素类型是 char。',
        '交换 s[i] 和 s[len-1-i]，i 走到 len/2 之前。',
        '别忘了先处理掉末尾的换行符，否则它会被换到字符串最前面。'
      ]
    },

    /* ---------------- 第 9 章 结构体 ---------------- */
    {
      id: 'h19',
      ch: '结构体与 typedef',
      title: '结构体存学生成绩',
      level: 2,
      task: '定义结构体存学生姓名和分数，读入 n 个学生，输出分数最高的那个。',
      detail: '输入：第一行 n；接下来 n 行，每行是「姓名 分数」（姓名不含空格）。\n输出：分数最高学生的姓名，行尾换行。\n分数互不相同。',
      starter: R`#include <stdio.h>

/* TODO: 定义 struct Student，包含 name 和 score */

int main(void) {
    int n;
    scanf("%d", &n);

    /* TODO: 读入学生，找出分数最高的 */

    printf("%s\n", "?");
    return 0;
}`,
      solution: R`#include <stdio.h>

typedef struct {
    char name[32];
    int score;
} Student;

int main(void) {
    int n;
    scanf("%d", &n);

    Student s[100];
    for (int i = 0; i < n; i++)
        scanf("%s %d", s[i].name, &s[i].score);

    int best = 0;
    for (int i = 1; i < n; i++) {
        if (s[i].score > s[best].score)
            best = i;
    }

    printf("%s\n", s[best].name);
    return 0;
}`,
      cases: [
        { in: '3\nAmy 90\nBob 85\nCid 95\n', expect: 'Cid\n' },
        { in: '1\nSolo 60\n', expect: 'Solo\n' },
        { in: '4\nA 10\nB 99\nC 50\nD 77\n', expect: 'B\n' }
      ],
      hints: [
        '结构体里放一个 char 数组存名字、一个 int 存分数。',
        '读字符串用 %s 不用取地址；读 int 要写 &s[i].score。',
        '先假设第 0 个最高，从第 1 个开始比，遇到更高的就记下下标。'
      ]
    },

    /* ---------------- 第 10 章 文件 ---------------- */
    {
      id: 'h20',
      ch: '文件操作',
      title: '写入文件再读出来',
      level: 3,
      task: '把读入的 n 个整数写进文件 numbers.txt，再读出来求和并输出。',
      detail: '输入：第一行 n，第二行 n 个整数。\n输出：这些数的和，行尾换行。\n要求：必须真的用 fprintf 写文件、fscanf 读文件，最后删掉这个文件。',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    /* TODO: 1. 用 "w" 打开 numbers.txt，把 n 和这些数写进去，关闭
             2. 用 "r" 重新打开，读回来求和，关闭
             3. remove("numbers.txt")
             4. 输出和 */

    printf("%d\n", 0);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int a[100];
    for (int i = 0; i < n; i++)
        scanf("%d", &a[i]);

    FILE *fp = fopen("numbers.txt", "w");
    if (fp == NULL) return 1;
    for (int i = 0; i < n; i++)
        fprintf(fp, "%d ", a[i]);
    fclose(fp);

    fp = fopen("numbers.txt", "r");
    if (fp == NULL) return 1;
    int sum = 0, v;
    for (int i = 0; i < n; i++) {
        if (fscanf(fp, "%d", &v) != 1) break;
        sum += v;
    }
    fclose(fp);

    remove("numbers.txt");
    printf("%d\n", sum);
    return 0;
}`,
      cases: [
        { in: '4\n1 2 3 4\n', expect: '10\n' },
        { in: '3\n-5 10 5\n', expect: '10\n' },
        { in: '1\n42\n', expect: '42\n' }
      ],
      hints: [
        '写用 fopen(name, "w") + fprintf + fclose；读用 fopen(name, "r") + fscanf + fclose。',
        'fscanf 读 int 要传地址：fscanf(fp, "%d", &v)。',
        '写完一定要 fclose，否则数据可能还在缓冲区，读的时候读不到。'
      ]
    }
  );
})(typeof globalThis !== 'undefined' ? globalThis : this);
