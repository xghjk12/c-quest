/* ===========================================================
   C 语言闯关 · 题库 第二部分（第 6 ~ 10 章）
   =========================================================== */
(function (root) {
  const R = String.raw;
  const CQ = root.CQ || (root.CQ = []);

  CQ.push(
    /* ---------------- 第 6 章 函数 ---------------- */
    {
      id: 'ch6',
      name: '函数',
      icon: '🧩',
      desc: '参数传递、返回值、递归、作用域',
      qs: [
        {
          t: 'output',
          q: '函数里的参数改了，外面的值会变吗？',
          code: R`#include <stdio.h>

void change(int x) {
    x = 100;
}

int main(void) {
    int a = 1;
    change(a);
    printf("%d\n", a);
    return 0;
}`,
          opts: ['100', '0', '1', '编译错误'],
          a: 2,
          why: 'C 的参数是"值传递"：change 拿到的是 a 的一份拷贝，改的是拷贝，跟外面的 a 没关系。想让函数改到外面，必须传地址（指针）。'
        },
        {
          t: 'output',
          q: '递归求阶乘，5! 是多少？',
          code: R`#include <stdio.h>

int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}

int main(void) {
    printf("%d\n", fact(5));
    return 0;
}`,
          opts: ['15', '120', '24', '720'],
          a: 1,
          why: '5! = 5 × 4 × 3 × 2 × 1 = 120。递归一定要有终止条件（n <= 1），否则会无限压栈直到崩溃。'
        },
        {
          t: 'output',
          q: '函数内部的变量，外面能直接用吗？',
          code: R`#include <stdio.h>

void f(void) {
    int a = 3;
    printf("%d\n", a);
}

int main(void) {
    f();
    printf("%d\n", a);
    return 0;
}`,
          opts: ['编译错误：a 未声明', '33', '30', '3 和随机值'],
          a: 0,
          expectCompileError: true,
          why: 'a 是 f 里的局部变量，作用域只到 f 的右大括号为止，main 里根本没有 a 这个名字，编译直接报 undeclared。所以上面这题连跑都跑不起来——想跨函数共享数据，就得靠参数、返回值或者全局变量。'
        },
        {
          t: 'output',
          q: '整数除法 vs 浮点除法：',
          code: R`#include <stdio.h>

double avg(int n, int a[]) {
    int s = 0;
    for (int i = 0; i < n; i++) s += a[i];
    return (double)s / n;
}

int main(void) {
    int a[4] = {1, 2, 3, 6};
    printf("%.1f\n", avg(4, a));
    return 0;
}`,
          opts: ['3', '3.5', '3.00', '3.0'],
          a: 3,
          why: '总和是 12，除以 4 得 3.0。关键是 (double)s / n：如果写成 s / n 就是整数除法，得 3 而不是 3.0。%.1f 保留一位小数。'
        },
        {
          t: 'output',
          q: 'static 局部变量有什么特别？',
          code: R`#include <stdio.h>

void f(void) {
    static int c = 0;
    c++;
    printf("%d", c);
}

int main(void) {
    f(); f(); f();
    printf("\n");
    return 0;
}`,
          opts: ['111', '012', '123', '333'],
          a: 2,
          why: 'static 局部变量只初始化一次，并且函数返回后也不销毁，下次调用时还记得上次的值。所以三次调用依次打印 1、2、3。普通局部变量则会每次都重置。'
        },
        {
          t: 'choice',
          q: '函数原型 int add(int, int); 的作用是？',
          code: R`#include <stdio.h>

int add(int, int);   /* 函数原型 */

int main(void) {
    printf("%d\n", add(2, 3));
    return 0;
}

int add(int x, int y) { return x + y; }`,
          opts: ['给函数分配内存', '提前告诉编译器参数和返回类型，便于检查调用', '把函数变成全局的', '只是注释，没有作用'],
          a: 1,
          why: '原型（声明）让编译器在真正定义之前就知道该怎么调用、该检查什么类型。调用出现在定义之前又没声明，老编译器会按 return int 猜，现代 C 直接报错。'
        },
        {
          t: 'bug',
          q: '这段代码死循环了。点出问题所在的行：',
          code: R`#include <stdio.h>

int fact(int n) {
    return n * fact(n - 1);
}

int main(void) {
    printf("%d\n", fact(4));
    return 0;
}`,
          a: 3,
          expectLine: 'return n * fact(n - 1);',
          why: '递归缺少终止条件：n 会一路减到负数还继续调，栈被压满后程序崩溃。任何递归都必须有"什么情况下不再递归"的判断。'
        }
      ]
    },

    /* ---------------- 第 7 章 指针 ---------------- */
    {
      id: 'ch7',
      name: '指针',
      icon: '🎯',
      desc: '取地址、解引用、指针改值、指针与数组',
      qs: [
        {
          t: 'output',
          q: '通过指针改值：',
          code: R`#include <stdio.h>

void set(int *p) {
    *p = 42;
}

int main(void) {
    int a = 7;
    set(&a);
    printf("%d\n", a);
    return 0;
}`,
          opts: ['7', '42', '0', '编译错误'],
          a: 1,
          why: '&a 把 a 的地址传进去，*p = 42 就是往那个地址里写 42，改到的是真正的 a。这就是"传地址"能让函数改变外部变量的原因。'
        },
        {
          t: 'output',
          q: '指针的算术运算：',
          code: R`#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    int *p = a;
    printf("%d\n", *(p + 2));
    return 0;
}`,
          opts: ['30', '20', '10', '12'],
          a: 0,
          why: '数组名退化成首元素地址，p = a 指向 a[0]。指针 + 2 不是加 2 个字节，而是往后移动 2 个元素，所以 *(p+2) 就是 a[2] = 30。'
        },
        {
          t: 'output',
          q: '指针先自增再取值：',
          code: R`#include <stdio.h>

int main(void) {
    int a[3] = {5, 6, 7};
    int *p = a;
    p++;
    printf("%d\n", *p);
    return 0;
}`,
          opts: ['5', '7', '地址值', '6'],
          a: 3,
          why: 'p++ 让指针跳到下一个元素（a[1]），再解引用拿到 6。注意 p++ 的值取决于位置：(*p)++ 是改元素的值，*p++ 是移动指针。'
        },
        {
          t: 'output',
          q: '交换两个数（正确的指针版）：',
          code: R`#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main(void) {
    int x = 1, y = 2;
    swap(&x, &y);
    printf("%d %d\n", x, y);
    return 0;
}`,
          opts: ['1 2', '2 2', '2 1', '1 1'],
          a: 2,
          why: '交换成功：x 变 2、y 变 1。如果参数写成 int a, int b（值传递），交换的只是副本，外面纹丝不动——这是指针最经典的用途。'
        },
        {
          t: 'output',
          q: 'NULL 指针解引用会怎样？',
          code: R`#include <stdio.h>

int main(void) {
    int *p = NULL;
    if (p != NULL) {
        printf("%d\n", *p);
    } else {
        printf("null\n");
    }
    return 0;
}`,
          opts: ['0', 'null', '崩溃', '编译错误'],
          a: 1,
          why: '先判断再解引用，这是正确姿势，所以安全地打印 null。如果直接 *p 就会访问 0 号地址，程序崩溃（段错误 / 访问冲突）。用指针前先判空是好习惯。'
        },
        {
          t: 'choice',
          q: 'int *p = &a; 中，*p 表示什么？',
          code: R`#include <stdio.h>

int main(void) {
    int a = 7;
    int *p = &a;
    printf("%d\n", *p);
    return 0;
}`,
          opts: ['p 所指向的那个变量的值', 'p 自己的地址', 'a 的地址', '一个叫 p 的数组'],
          a: 0,
          why: '* 是"解引用"运算符，*p 就是顺着 p 存的地址去取那个变量。& 是取地址，两者互为逆操作。指针变量本身占 8 字节（64 位系统）。'
        },
        {
          t: 'bug',
          q: '经典指针错误，点出问题所在的行：',
          code: R`#include <stdio.h>

int main(void) {
    int *p;
    *p = 5;
    printf("%d\n", *p);
    return 0;
}`,
          a: 4,
          expectLine: '*p = 5',
          why: 'p 是野指针：没初始化，里面是随机地址，往那儿写 5 属于未定义行为，可能崩溃、可能悄悄写坏别处。使用前必须让它指向有效内存（int x; p = &x; 或 p = malloc(...)）。'
        }
      ]
    },

    /* ---------------- 第 8 章 字符串 ---------------- */
    {
      id: 'ch8',
      name: '字符与字符串',
      icon: '🔤',
      desc: '数组 vs 字符串、strlen、结尾的 \\0',
      qs: [
        {
          t: 'output',
          q: 'strlen 算不算结尾的 \\0？',
          code: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "abc";
    printf("%d\n", (int)strlen(s));
    return 0;
}`,
          opts: ['3', '4', '2', '随机值'],
          a: 0,
          why: 'strlen 数的是 \\0 之前的字符个数，所以是 3。但数组 s 实际占 4 个字节（\'a\'、\'b\'、\'c\'、\'\\0\'），这个区别在申请空间时非常致命——忘了留 \\0 的位置就会越界。'
        },
        {
          t: 'output',
          q: 'sizeof 和 strlen 差多少？',
          code: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "abc";
    printf("%d %d\n", (int)sizeof(s), (int)strlen(s));
    return 0;
}`,
          opts: ['3 3', '4 4', '3 4', '4 3'],
          a: 3,
          why: 'sizeof 算的是整个数组占多少字节，包含 \\0，得 4；strlen 算的是可见字符数，得 3。sizeof 是编译期算子，strlen 是运行时函数。'
        },
        {
          t: 'output',
          q: '改字符数组里的一个字符：',
          code: R`#include <stdio.h>

int main(void) {
    char s[] = "hello";
    s[0] = 'H';
    printf("%s\n", s);
    return 0;
}`,
          opts: ['hello', 'H', 'Hello', '编译错误'],
          a: 2,
          why: 's 是可修改的字符数组，s[0] 改成功，打印 Hello。但如果是 char *s = "hello"; s[0] = \'H\'; 就会崩——指针指向的是只读的字符串常量区。'
        },
        {
          t: 'output',
          q: '字符串比较用哪个？',
          code: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char a[] = "apple";
    char b[] = "apple";
    printf("%d %d\n", a == b, strcmp(a, b) == 0);
    return 0;
}`,
          opts: ['1 1', '0 1', '0 0', '1 0'],
          a: 1,
          why: '两个不同的数组，a == b 比的是地址，当然不等，得 0。strcmp 才逐字符比内容，相等返回 0。比较字符串永远用 strcmp，别用 ==。'
        },
        {
          t: 'output',
          q: '复制字符串的正确做法：',
          code: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char dst[16];
    strcpy(dst, "C");
    strcat(dst, " language");
    printf("%s\n", dst);
    return 0;
}`,
          opts: ['C language', 'C', 'language', 'C language '],
          a: 0,
          why: 'strcpy 把 "C" 拷进 dst（含 \\0），strcat 再从 dst 末尾的 \\0 处接着拼上 " language"，结果是 C language，共 10 个字符，16 字节够放。'
        },
        {
          t: 'choice',
          q: '字符串 "abc" 在内存里实际占几个字节？',
          code: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "abc";
    printf("%d %d\n", (int)sizeof(s), (int)strlen(s));
    return 0;
}`,
          opts: ['3', '6', '不确定', '4'],
          a: 3,
          why: 'a、b、c、\\0 共 4 个字节。\\0 是字符串的结束标志，printf / strlen / strcpy 这些函数全靠它知道"到这儿结束了"，少了它就会一直读下去。'
        },
        {
          t: 'bug',
          q: '字符串改了会崩溃，点出问题所在的行：',
          code: R`#include <stdio.h>

int main(void) {
    char *s = "hello";
    s[0] = 'H';
    printf("%s\n", s);
    return 0;
}`,
          a: 4,
          expectLine: "s[0] = 'H'",
          why: '指针指向的是程序里的只读字符串常量，"hello" 存在只读区，写它就会触发访问违规。要能改就改成数组：char s[] = "hello"; 那样数据会拷到栈上的可写数组里。'
        }
      ]
    },

    /* ---------------- 第 9 章 结构体 ---------------- */
    {
      id: 'ch9',
      name: '结构体与 typedef',
      icon: '🏗️',
      desc: '定义、访问、指针访问、结构体内存',
      qs: [
        {
          t: 'output',
          q: '用 . 访问结构体成员：',
          code: R`#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point p = {3, 4};
    printf("%d\n", p.x + p.y);
    return 0;
}`,
          opts: ['34', '3', '4', '7'],
          a: 3,
          why: '{3, 4} 按顺序初始化 x = 3、y = 4，相加得 7。用普通变量访问成员用 .，用指针访问才用 ->。'
        },
        {
          t: 'output',
          q: '用指针访问结构体成员：',
          code: R`#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point p = {3, 4};
    struct Point *pp = &p;
    pp->x = 10;
    printf("%d %d\n", p.x, pp->y);
    return 0;
}`,
          opts: ['3 4', '10 10', '10 4', '编译错误'],
          a: 2,
          why: 'pp->x 等价于 (*pp).x，改的是 p 的 x，所以 p.x 变 10；y 没动还是 4。-> 是访问指针所指结构体成员的专用写法，比 (*pp).x 好读。'
        },
        {
          t: 'output',
          q: '结构体数组：',
          code: R`#include <stdio.h>

typedef struct {
    char name[8];
    int score;
} Student;

int main(void) {
    Student a[2] = {{"Amy", 90}, {"Bob", 85}};
    printf("%s %d\n", a[1].name, a[0].score);
    return 0;
}`,
          opts: ['Amy 90', 'Bob 90', 'Bob 85', 'Amy 85'],
          a: 1,
          why: 'a[1] 是第二个学生 Bob，a[0].score 是第一个学生的 90。typedef 之后就不用每次写 struct Student 了，直接 Student 就行。'
        },
        {
          t: 'output',
          q: '结构体可以直接赋值吗？',
          code: R`#include <stdio.h>

typedef struct { int a, b; } Pair;

int main(void) {
    Pair p1 = {1, 2};
    Pair p2 = p1;
    p2.a = 99;
    printf("%d %d\n", p1.a, p2.a);
    return 0;
}`,
          opts: ['1 99', '99 99', '1 2', '99 1'],
          a: 0,
          why: '同类型结构体可以直接 = 赋值，做的是逐成员的"浅拷贝"，p2 是独立的一份。所以改 p2.a 不影响 p1.a。但如果成员里有指针，拷的只是指针，两边仍指向同一块内存——那就要小心了。'
        },
        {
          t: 'output',
          q: '结构体作为函数参数：',
          code: R`#include <stdio.h>

typedef struct { int x, y; } P;

int sum(P p) {
    p.x = 100;
    return p.x + p.y;
}

int main(void) {
    P p = {1, 2};
    printf("%d %d\n", sum(p), p.x);
    return 0;
}`,
          opts: ['3 1', '102 100', '3 100', '102 1'],
          a: 3,
          why: '结构体当普通参数传递时也是值传递，改的是拷贝，所以外面的 p.x 还是 1。函数内把 x 改成 100，返回 100 + 2 = 102。想改原结构体就传指针 P *p。'
        },
        {
          t: 'choice',
          q: 'typedef struct { int x; } A; 这行的作用是？',
          code: R`#include <stdio.h>

typedef struct { int x; } A;

int main(void) {
    A s;
    s.x = 5;
    printf("%d\n", s.x);
    return 0;
}`,
          opts: ['定义了一个叫 A 的结构体变量', '声明了一个指向结构体的指针', '给这个结构体类型起了个别名 A', '创建了一个数组 A'],
          a: 2,
          why: 'typedef 是给类型起别名，之后可以直接写 A s; 而不是 struct { int x; } s;。它是类型层面的操作，不分配任何内存，也不产生变量。'
        },
        {
          t: 'bug',
          q: '编译报错，点出问题所在的行：',
          code: R`#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point p = {1, 2};
    p->x = 5;
    printf("%d\n", p.x);
    return 0;
}`,
          a: 9,
          expectLine: 'p->x = 5',
          why: 'p 是普通结构体变量，不是指针，访问成员要用 p.x。-> 只能用在指针上（比如 &p 给了指针变量 pp 之后 pp->x）。编译器会报"p 不是指针"一类的错。'
        }
      ]
    },

    /* ---------------- 第 10 章 文件与综合 ---------------- */
    {
      id: 'ch10',
      name: '文件操作',
      icon: '💾',
      desc: 'fopen / fprintf / fscanf / fclose',
      qs: [
        {
          t: 'output',
          q: 'fopen 失败时会返回什么？',
          code: R`#include <stdio.h>

int main(void) {
    FILE *fp = fopen("no_such_file_12345.txt", "r");
    if (fp == NULL) {
        printf("open failed\n");
    } else {
        printf("ok\n");
        fclose(fp);
    }
    return 0;
}`,
          opts: ['ok', '崩溃', 'open failed', '编译错误'],
          a: 2,
          why: '文件不存在时 fopen 返回 NULL。所以每次 fopen 之后都要判空，否则后面 fp 为 NULL 还去读写就会崩。'
        },
        {
          t: 'output',
          q: 'fprintf 和 printf 的区别：',
          code: R`#include <stdio.h>

int main(void) {
    FILE *fp = fopen("_t_demo.txt", "w");
    fprintf(fp, "%d\n", 42);
    fclose(fp);

    fp = fopen("_t_demo.txt", "r");
    int v = 0;
    fscanf(fp, "%d", &v);
    fclose(fp);
    printf("%d\n", v);
    remove("_t_demo.txt");
    return 0;
}`,
          opts: ['0', '42', '42\\n', '编译错误'],
          a: 1,
          why: 'fprintf 第一个参数是要写的文件，其余和 printf 一样；读回来用 fscanf，注意要传 &v（地址）。写进去的是文本 "42\\n"，读出来转成整数 42 打印，结果就是 42。'
        },
        {
          t: 'output',
          q: '"w" 和 "a" 打开方式的区别：',
          code: R`#include <stdio.h>

int main(void) {
    FILE *fp = fopen("_t_app.txt", "w");
    fprintf(fp, "A");
    fclose(fp);

    fp = fopen("_t_app.txt", "a");
    fprintf(fp, "B");
    fclose(fp);

    fp = fopen("_t_app.txt", "r");
    char buf[16] = {0};
    fscanf(fp, "%s", buf);
    fclose(fp);
    printf("%s\n", buf);
    remove("_t_app.txt");
    return 0;
}`,
          opts: ['AB', 'B', 'A', 'BA'],
          a: 0,
          why: '"w" 会把文件清空再写，写入 A；"a" 是追加模式，在末尾接着写 B，得到 AB。要覆盖用 "w"，要继续往后写用 "a"。'
        },
        {
          t: 'output',
          q: '用 "r" 打开一个不存在的文件？',
          code: R`#include <stdio.h>

int main(void) {
    FILE *fp = fopen("definitely_missing_999.txt", "w");
    if (fp == NULL) {
        printf("null\n");
        return 0;
    }
    fclose(fp);
    remove("definitely_missing_999.txt");
    printf("created\n");
    return 0;
}`,
          opts: ['null', '崩溃', '编译错误', 'created'],
          a: 3,
          why: '用 "w" 打开不存在的文件会自动创建，所以不会返回 NULL，打印 created。只有当路径非法、没权限、或者用 "r" 打开不存在的文件时才会返回 NULL。'
        },
        {
          t: 'output',
          q: '读文件要按什么方式打开？',
          code: R`#include <stdio.h>

int main(void) {
    FILE *fw = fopen("_t_r.txt", "w");
    fprintf(fw, "%d %d\n", 3, 9);
    fclose(fw);

    FILE *fr = fopen("_t_r.txt", "r");
    int a = 0, b = 0;
    fscanf(fr, "%d %d", &a, &b);
    fclose(fr);
    remove("_t_r.txt");
    printf("%d\n", a * b);
    return 0;
}`,
          opts: ['3', '9', '27', '12'],
          a: 2,
          why: '读文件必须用 "r" 模式（"w" 会清空）。fscanf 按空白分隔读两个整数，得到 3 和 9，乘积 27。'
        },
        {
          t: 'choice',
          q: '文件用完为什么必须 fclose？',
          code: R`#include <stdio.h>

int main(void) {
    FILE *fp = fopen("out.txt", "w");
    fprintf(fp, "data\n");
    fclose(fp);
    return 0;
}`,
          opts: ['只是礼貌，可以不写', '把缓冲区里的数据真正写进磁盘，并释放文件句柄', '不关文件会被删除', '关掉后文件才能再打开'],
          a: 1,
          why: '写文件是带缓冲的，数据先攒在内存里，fclose 时才刷盘；同时它释放系统句柄。程序正常退出通常会替你刷，但进程被强制杀掉、或者文件开太多超过上限时，不关就真出问题。'
        },
        {
          t: 'bug',
          q: '这段代码想写文件，但方式错了。点出真正有问题的那一行：',
          code: R`#include <stdio.h>

int main(void) {
    FILE *fp = fopen("data.txt", "r");
    fprintf(fp, "hello\n");
    fclose(fp);
    return 0;
}`,
          a: 3,
          expectLine: 'fopen("data.txt", "r")',
          why: '用 "r" 是只读方式打开，却拿它 fprintf 往里写——根本写不进去。而且文件若不存在，fopen 返回 NULL，下一行 fprintf 直接崩溃。要写文件必须用 "w" 或 "a"，并且 fopen 之后先判空。'
        }
      ]
    }
  );
})(typeof globalThis !== 'undefined' ? globalThis : this);
