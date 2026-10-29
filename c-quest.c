/* =============================================================
 *  C Quest —— C 语言闯关（终端版）
 *
 *  这个程序本身就是一份可以读、可以改的 C 教材：
 *  它用结构体存题、用数组管题库、用 switch 做菜单、用文件做存档。
 *  玩腻了可以打开源码改题目，改完用 build/run-c.bat 重新编译。
 *
 *  编译：  tcc -o c-quest.exe c-quest.c
 *      或  gcc -O2 -o c-quest c-quest.c
 *  运行：  ./c-quest.exe
 * ============================================================= */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
#include <windows.h>
#define SLEEP_MS(ms) Sleep(ms)
#else
#include <unistd.h>
#define SLEEP_MS(ms) usleep((ms) * 1000)
#endif

/* ---------- 可调参数 ---------- */
#define MAX_HEARTS      3
#define OPT_COUNT       4
#define PASS_RATE       60      /* 答对百分比达到这个值才算通关 */
#define SAVE_FILE       "cquest_save.txt"

/* ---------- 题型 ---------- */
typedef enum {
    Q_OUTPUT = 0,   /* 预测输出 */
    Q_CHOICE,       /* 概念选择 */
    Q_BUG           /* 找出错行 */
} QType;

/* ---------- 一道题 ---------- */
typedef struct {
    QType       type;
    const char *question;       /* 题干 */
    const char *code;           /* 代码（可能多行，用 \n 分隔） */
    const char *opts[OPT_COUNT];
    int         answer;         /* 正确选项下标（0 起） */
    const char *why;            /* 解析 */
} Question;

/* ---------- 一个章节 ---------- */
typedef struct {
    const char     *name;
    const char     *desc;
    const Question *qs;
    int             count;
} Chapter;

/* ---------- 玩家存档 ---------- */
typedef struct {
    int stars[16];      /* 每章星级 0~3 */
    int best[16];       /* 每章最高分 */
    int played;         /* 是否玩过 */
} Save;

/* =============================================================
 *  题库（本段由 build/gen-c-bank.js 从 bank-a.js / bank-b.js 自动生成）
 *  想改题目请改网页版题库，然后跑一次： node build/gen-c-bank.js
 * ============================================================= */

static const Question ch1_qs[] = {
    { Q_OUTPUT,
      "这段程序会打印什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"%d\\n\", 7 / 2);\n"
      "    return 0;\n"
      "}",
      { "3.5", "4", "2", "3" },
      3,
      "整数除以整数，结果还是整数：小数部分被直接丢掉（不是四舍五入），所以 7 / 2 = 3。想让结果带小数，至少有一边要是浮点数，比如 7 / 2.0。" },

    { Q_OUTPUT,
      "把 2 换成 2.0 之后呢？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"%.2f\\n\", 7 / 2.0);\n"
      "    return 0;\n"
      "}",
      { "3.5", "3", "3.50", "3.00" },
      2,
      "7 是 int、2.0 是 double，混合运算时 int 会先被提升成 double，于是做的是浮点除法，得 3.5。%.2f 表示保留两位小数，所以打印 3.50。" },

    { Q_OUTPUT,
      "字符其实也是整数。这里打印什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    char c = 'A' + 1;\n"
      "    printf(\"%c\\n\", c);\n"
      "    return 0;\n"
      "}",
      { "66", "B", "A1", "A" },
      1,
      "'A' 的值是 65，加 1 得 66。赋给 char 后用 %c 按字符打印，66 对应的字符就是 'B'。若用 %d 打印，就会输出数字 66。" },

    { Q_OUTPUT,
      "把小数赋给 int 变量，会怎样？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int x = 3.9;\n"
      "    printf(\"%d\\n\", x);\n"
      "    return 0;\n"
      "}",
      { "3", "4", "3.9", "0" },
      0,
      "把 double 赋给 int 会截断小数部分，是朝零取整而不是四舍五入，所以 3.9 变成 3。真要四舍五入得自己写 (int)(x + 0.5)。" },

    { Q_OUTPUT,
      "无符号字符装不下 256，会发生什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    unsigned char c = 255;\n"
      "    c = c + 1;\n"
      "    printf(\"%d\\n\", c);\n"
      "    return 0;\n"
      "}",
      { "256", "255", "-1", "0" },
      3,
      "unsigned char 只能存 0 ~ 255。255 + 1 = 256 超范围，按模 256 回绕成 0。整型溢出是 C 里最阴的 bug 之一，算之前先想想结果会不会越界。" },

    { Q_CHOICE,
      "下面哪个变量名在 C 里是不合法的？",
      "#include <stdio.h>\n\nint main(void) {\n    int 2nd = 1;\n    return 0;\n}",
      { "my_age", "_count", "2nd", "totalScore" },
      2,
      "标识符只能由字母、数字、下划线组成，而且不能以数字开头，所以 2nd 非法。其余三个都合法；另外 int、return 这类关键字也不能拿来当变量名。" },

    { Q_BUG,
      "这段代码编译不过。点出出问题的那一行：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a = 1\n"
      "    printf(\"%d\\n\", a);\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      3,
      "第 4 行 int a = 1 后面少了分号。C 用分号结束语句。要注意编译器往往是在下一行才报错，所以看报错信息时，真正的错常常在上一行结尾。" }
};

static const Question ch2_qs[] = {
    { Q_OUTPUT,
      "先乘除后加减，这里打印什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a = 2, b = 3, c = 4;\n"
      "    printf(\"%d\\n\", a + b * c);\n"
      "    return 0;\n"
      "}",
      { "20", "24", "14", "9" },
      2,
      "乘法优先级高于加法，先算 b * c = 12，再加上 a = 2，得到 14。想先加就必须写括号 (a + b) * c。" },

    { Q_OUTPUT,
      "a++ 和 ++a 差在哪？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a = 5;\n"
      "    int b = a++;\n"
      "    int c = ++a;\n"
      "    printf(\"%d %d %d\\n\", a, b, c);\n"
      "    return 0;\n"
      "}",
      { "7 6 6", "7 5 7", "6 5 7", "5 6 7" },
      1,
      "a++ 是\"先用后加\"：b 拿到 5，然后 a 变成 6。++a 是\"先加后用\"：a 先变成 7，c 才拿到 7。所以最终 a=7、b=5、c=7。" },

    { Q_OUTPUT,
      "负数取模，符号跟谁走？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"%d\\n\", -10 % 3);\n"
      "    return 0;\n"
      "}",
      { "-1", "1", "-3", "0" },
      0,
      "C99 起规定：% 的结果符号跟随被除数，所以 -10 % 3 = -1。想让余数永远非负，写 ((-10 % 3) + 3) % 3。" },

    { Q_OUTPUT,
      "&& 的短路规则：右边还会执行吗？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int i = 0;\n"
      "    int x = (i++ && 0);\n"
      "    printf(\"%d %d\\n\", i, x);\n"
      "    return 0;\n"
      "}",
      { "0 0", "1 1", "0 1", "1 0" },
      3,
      "&& 左边为假就短路，右边的 0 根本不会被求值。但左边的 i++ 已经执行过了，所以 i = 1；整个表达式为假，x = 0。" },

    { Q_OUTPUT,
      "按位运算，三个结果依次是什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"%d %d %d\\n\", 5 & 3, 5 | 3, 5 ^ 3);\n"
      "    return 0;\n"
      "}",
      { "7 1 6", "1 6 7", "1 7 6", "5 3 6" },
      2,
      "5 = 101，3 = 011，逐位计算：与 & 得 001 = 1，或 | 得 111 = 7，异或 ^（不同为 1）得 110 = 6。" },

    { Q_CHOICE,
      "表达式 3 > 2 的值是什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"%d\\n\", 3 > 2);\n"
      "    return 0;\n"
      "}",
      { "真", "1", "3", "0" },
      1,
      "C 的关系运算结果就是一个 int：真为 1，假为 0。所以 printf(\"%d\", 3 > 2) 打印 1。也正因如此，可以写 printf(\"%d\", (1 < 2) + (3 > 4))，结果是 1。" },

    { Q_BUG,
      "这段代码能编译，但行为和你想的不一样。点出出问题的那一行：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a = 3;\n"
      "    if (a = 0) {\n"
      "        printf(\"zero\\n\");\n"
      "    } else {\n"
      "        printf(\"not zero\\n\");\n"
      "    }\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      4,
      "if (a = 0) 是赋值不是比较：a 被改成 0，整个表达式的值就是 0（假），于是走 else。想比较必须写 a == 0。编译器一般会给警告，别忽略它。" }
};

static const Question ch3_qs[] = {
    { Q_OUTPUT,
      "0 在 C 里代表什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int x = 0;\n"
      "    if (x)\n"
      "        printf(\"A\\n\");\n"
      "    else\n"
      "        printf(\"B\\n\");\n"
      "    return 0;\n"
      "}",
      { "A", "B", "AB", "编译错误" },
      1,
      "C 里 0 是假，任何非 0 都是真。x = 0 为假，走 else 打印 B。条件里可以直接放整数，不需要写 x == 0 这种比较。" },

    { Q_OUTPUT,
      "这个 else 到底属于哪个 if？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a = 3;\n"
      "    if (a > 1)\n"
      "        if (a > 5)\n"
      "            printf(\"X\\n\");\n"
      "        else\n"
      "            printf(\"Y\\n\");\n"
      "    return 0;\n"
      "}",
      { "Y", "X", "什么都不打印", "编译错误" },
      0,
      "else 永远和最近的、还没配对的 if 配对，所以它属于内层 if (a > 5)。a = 3 满足 a > 1、不满足 a > 5，于是打印 Y。想改变归属就加大括号。" },

    { Q_OUTPUT,
      "漏写 break 会怎样？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n = 2;\n"
      "    switch (n) {\n"
      "        case 1: printf(\"one \");\n"
      "        case 2: printf(\"two \");\n"
      "        case 3: printf(\"three \");\n"
      "        default: printf(\"other\");\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
      { "two", "three other", "one two three other", "two three other" },
      3,
      "case 只是\"入口标签\"，匹配到 case 2 后如果没有 break，就会一路穿透执行后面所有语句，连 default 也不放过。这就是经典的 fallthrough 陷阱。" },

    { Q_OUTPUT,
      "多个 case 共用一个分支，合法吗？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    char grade = 'A';\n"
      "    switch (grade) {\n"
      "        case 'A':\n"
      "        case 'B':\n"
      "            printf(\"good\\n\");\n"
      "            break;\n"
      "        case 'C':\n"
      "            printf(\"pass\\n\");\n"
      "            break;\n"
      "        default:\n"
      "            printf(\"fail\\n\");\n"
      "    }\n"
      "    return 0;\n"
      "}",
      { "pass", "fail", "good", "编译错误" },
      2,
      "case 'A' 后面没有语句，会直接落到 case 'B' 的 printf 上，于是 A 和 B 共用同一个分支。这是 C 里合法的写法，也是最推荐的穿透用法。" },

    { Q_OUTPUT,
      "else if 链条怎么走？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int score = 75;\n"
      "    if (score >= 90)\n"
      "        printf(\"A\\n\");\n"
      "    else if (score >= 60)\n"
      "        printf(\"B\\n\");\n"
      "    else\n"
      "        printf(\"C\\n\");\n"
      "    return 0;\n"
      "}",
      { "A", "B", "C", "BC" },
      1,
      "从上往下逐个判断，第一个为真的分支执行后，后面的分支全部跳过。75 不满足 >= 90，但满足 >= 60，所以打印 B，不会再去判断 else。" },

    { Q_CHOICE,
      "想判断 n 是不是偶数，正确写法是？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n = 8;\n"
      "    if ( /* 这里填什么？ */ )\n"
      "        printf(\"even\\n\");\n"
      "    return 0;\n"
      "}",
      { "n % 2 == 0", "n / 2 == 0", "n % 2 = 0", "n % 2 == 1" },
      0,
      "偶数就是除以 2 余 0，所以 n % 2 == 0。比较必须用 ==，写成 n % 2 = 0 是赋值，而且左边不是可赋值的\"左值\"，编译器会直接报错。" },

    { Q_BUG,
      "这段代码逻辑错了：a = 15 却打印 in range。点出问题所在的行：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a = 15;\n"
      "    if (0 < a < 10)\n"
      "        printf(\"in range\\n\");\n"
      "    else\n"
      "        printf(\"out of range\\n\");\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      4,
      "C 里 0 < a < 10 是从左到右算的：(0 < a) 得到 1，再判断 1 < 10 得到 1，永远为真。正确写法是 a > 0 && a < 10。数学式子和 C 表达式不是一回事。" }
};

static const Question ch4_qs[] = {
    { Q_OUTPUT,
      "1 加到 5，结果是多少？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int sum = 0;\n"
      "    for (int i = 1; i <= 5; i++)\n"
      "        sum += i;\n"
      "    printf(\"%d\\n\", sum);\n"
      "    return 0;\n"
      "}",
      { "15", "10", "14", "21" },
      0,
      "i 依次是 1、2、3、4、5，累加得 15。如果把条件写成 i < 5，就只加 4 项得 10——循环边界差一是初学者最常见的错误。" },

    { Q_OUTPUT,
      "continue 会跳过什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int i;\n"
      "    for (i = 0; i < 6; i++) {\n"
      "        if (i % 2 == 0)\n"
      "            continue;\n"
      "        printf(\"%d\", i);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
      { "024", "12345", "0245", "135" },
      3,
      "continue 跳过本轮剩下的语句，直接进入下一轮。i 是偶数时被跳过，只打印 1、3、5。注意 for 里的 i++ 依然会执行，所以不会死循环。" },

    { Q_OUTPUT,
      "break 又跳到哪里？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int i;\n"
      "    for (i = 0; i < 10; i++) {\n"
      "        if (i == 3)\n"
      "            break;\n"
      "        printf(\"%d\", i);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
      { "0123", "3", "012", "0123456789" },
      2,
      "break 直接跳出整个循环。i 走到 3 时条件成立，立刻结束循环，所以只打印了 0、1、2。continue 是\"跳过本轮\"，break 是\"整个不干了\"。" },

    { Q_OUTPUT,
      "do-while 的条件一开始就不成立，循环体会执行吗？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int i = 10;\n"
      "    do {\n"
      "        printf(\"%d \", i);\n"
      "        i++;\n"
      "    } while (i < 3);\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
      { "", "10", "10 11 12", "无限循环" },
      1,
      "do-while 先执行一次再判断条件，所以哪怕 i = 10 一开始就不满足 i < 3，循环体也会跑一次，打印一次 10。这就是它和 while 最本质的区别。" },

    { Q_OUTPUT,
      "两层循环一共转多少次？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int count = 0;\n"
      "    for (int i = 0; i < 3; i++)\n"
      "        for (int j = 0; j < 4; j++)\n"
      "            count++;\n"
      "    printf(\"%d\\n\", count);\n"
      "    return 0;\n"
      "}",
      { "12", "7", "3", "4" },
      0,
      "外层每转 1 次，内层转满 4 次，共 3 × 4 = 12 次。嵌套循环的总次数 = 外层次数 × 内层次数。" },

    { Q_CHOICE,
      "for (;;) 表示什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int i = 0;\n"
      "    for (;;) {\n"
      "        if (++i > 3) break;\n"
      "        printf(\"%d \", i);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
      { "语法错误", "循环 0 次", "循环 1 次", "死循环" },
      3,
      "for 的三个部分都可省略：没初始化、条件省略视为恒真、没步进，所以是死循环，等价于 while (1)。通常配合 break 在内部跳出。" },

    { Q_BUG,
      "这段代码会卡死。点出问题所在的行：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int i = 1, sum = 0;\n"
      "    while (i <= 5);\n"
      "    {\n"
      "        sum += i;\n"
      "        i++;\n"
      "    }\n"
      "    printf(\"%d\\n\", sum);\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      4,
      "while 后面多了一个分号，循环体变成了空语句 ;，i 永远不变，循环永远停不下来。写 while/for 时括号后别手滑加分号——这是真实项目里也会犯的错。" }
};

static const Question ch5_qs[] = {
    { Q_OUTPUT,
      "只初始化前 3 个元素，后面是什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[5] = {1, 2, 3};\n"
      "    printf(\"%d\\n\", a[3]);\n"
      "    return 0;\n"
      "}",
      { "随机值", "3", "编译错误", "0" },
      3,
      "用 {…} 部分初始化时，剩下的元素会自动补 0，所以 a[3] = 0、a[4] = 0。注意这跟\"完全不初始化\"不一样：int a[5]; 里就是垃圾值了。" },

    { Q_OUTPUT,
      "怎么算数组有多少个元素？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[] = {1, 2, 3, 4};\n"
      "    printf(\"%d\\n\", (int)(sizeof(a) / sizeof(a[0])));\n"
      "    return 0;\n"
      "}",
      { "16", "1", "4", "8" },
      2,
      "sizeof(a) 是整个数组的字节数（16），sizeof(a[0]) 是一个元素的大小（4），相除得元素个数 4。这个技巧只在数组还在当前作用域时有效——数组一旦当参数传进函数就会退化成指针。" },

    { Q_OUTPUT,
      "二维数组的下标怎么取？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};\n"
      "    printf(\"%d\\n\", a[1][2]);\n"
      "    return 0;\n"
      "}",
      { "3", "6", "5", "4" },
      1,
      "行、列都从 0 开始编号。a[1] 是第二行 {4, 5, 6}，a[1][2] 是这一行的第三列，即 6。" },

    { Q_OUTPUT,
      "把数组元素全加起来：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[4] = {10, 20, 30, 40};\n"
      "    int s = 0;\n"
      "    for (int i = 0; i < 4; i++)\n"
      "        s += a[i];\n"
      "    printf(\"%d\\n\", s);\n"
      "    return 0;\n"
      "}",
      { "100", "70", "90", "110" },
      0,
      "10 + 20 + 30 + 40 = 100。循环条件用 i < 4，因为有效下标是 0 ~ 3。遍历数组时把 4 写死很危险，改成 sizeof(a)/sizeof(a[0]) 更安全。" },

    { Q_CHOICE,
      "int a[3]; 的有效下标范围是？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[3];\n"
      "    /* a 的有效下标是？ */\n"
      "    return 0;\n"
      "}",
      { "1、2、3", "0、1、2、3", "任意整数", "0、1、2" },
      3,
      "C 数组下标从 0 开始，n 个元素的下标是 0 ~ n-1，所以 int a[3] 只能用 a[0]、a[1]、a[2]。a[3] 已经越界。" },

    { Q_BUG,
      "这段代码有越界问题。点出出错的那一行：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[3];\n"
      "    for (int i = 0; i <= 3; i++) {\n"
      "        a[i] = i;\n"
      "    }\n"
      "    printf(\"done\\n\");\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      4,
      "有效下标只有 0 ~ 2，i <= 3 会写到 a[3]，越界了。C 不检查数组越界，多写的那一格可能覆盖掉别的变量，程序可能崩也可能\"看起来正常\"——这种 bug 最难查。条件应改成 i < 3。" },

    { Q_CHOICE,
      "int a[3] = {1, 2, 3, 4}; 会怎样？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[3] = {1, 2, 3, 4};\n"
      "    return 0;\n"
      "}",
      { "自动扩容成 4 个元素", "多出来的 4 被丢弃", "编译错误：初始值过多", "运行时崩溃" },
      2,
      "数组大小在定义时就定了，{1, 2, 3, 4} 有 4 个初始值塞不进 3 个格子，编译器直接报错（too many initializers）。数量不够会自动补 0，但多了不行。" }
};

static const Question ch6_qs[] = {
    { Q_OUTPUT,
      "函数里的参数改了，外面的值会变吗？",
      "#include <stdio.h>\n"
      "\n"
      "void change(int x) {\n"
      "    x = 100;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int a = 1;\n"
      "    change(a);\n"
      "    printf(\"%d\\n\", a);\n"
      "    return 0;\n"
      "}",
      { "100", "0", "1", "编译错误" },
      2,
      "C 的参数是\"值传递\"：change 拿到的是 a 的一份拷贝，改的是拷贝，跟外面的 a 没关系。想让函数改到外面，必须传地址（指针）。" },

    { Q_OUTPUT,
      "递归求阶乘，5! 是多少？",
      "#include <stdio.h>\n"
      "\n"
      "int fact(int n) {\n"
      "    if (n <= 1) return 1;\n"
      "    return n * fact(n - 1);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"%d\\n\", fact(5));\n"
      "    return 0;\n"
      "}",
      { "15", "120", "24", "720" },
      1,
      "5! = 5 × 4 × 3 × 2 × 1 = 120。递归一定要有终止条件（n <= 1），否则会无限压栈直到崩溃。" },

    { Q_OUTPUT,
      "函数内部的变量，外面能直接用吗？",
      "#include <stdio.h>\n"
      "\n"
      "void f(void) {\n"
      "    int a = 3;\n"
      "    printf(\"%d\\n\", a);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    f();\n"
      "    printf(\"%d\\n\", a);\n"
      "    return 0;\n"
      "}",
      { "编译错误：a 未声明", "33", "30", "3 和随机值" },
      0,
      "a 是 f 里的局部变量，作用域只到 f 的右大括号为止，main 里根本没有 a 这个名字，编译直接报 undeclared。所以上面这题连跑都跑不起来——想跨函数共享数据，就得靠参数、返回值或者全局变量。" },

    { Q_OUTPUT,
      "整数除法 vs 浮点除法：",
      "#include <stdio.h>\n"
      "\n"
      "double avg(int n, int a[]) {\n"
      "    int s = 0;\n"
      "    for (int i = 0; i < n; i++) s += a[i];\n"
      "    return (double)s / n;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int a[4] = {1, 2, 3, 6};\n"
      "    printf(\"%.1f\\n\", avg(4, a));\n"
      "    return 0;\n"
      "}",
      { "3", "3.5", "3.00", "3.0" },
      3,
      "总和是 12，除以 4 得 3.0。关键是 (double)s / n：如果写成 s / n 就是整数除法，得 3 而不是 3.0。%.1f 保留一位小数。" },

    { Q_OUTPUT,
      "static 局部变量有什么特别？",
      "#include <stdio.h>\n"
      "\n"
      "void f(void) {\n"
      "    static int c = 0;\n"
      "    c++;\n"
      "    printf(\"%d\", c);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    f(); f(); f();\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
      { "111", "012", "123", "333" },
      2,
      "static 局部变量只初始化一次，并且函数返回后也不销毁，下次调用时还记得上次的值。所以三次调用依次打印 1、2、3。普通局部变量则会每次都重置。" },

    { Q_CHOICE,
      "函数原型 int add(int, int); 的作用是？",
      "#include <stdio.h>\n"
      "\n"
      "int add(int, int);   /* 函数原型 */\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"%d\\n\", add(2, 3));\n"
      "    return 0;\n"
      "}\n"
      "\n"
      "int add(int x, int y) { return x + y; }",
      { "给函数分配内存", "提前告诉编译器参数和返回类型，便于检查调用", "把函数变成全局的", "只是注释，没有作用" },
      1,
      "原型（声明）让编译器在真正定义之前就知道该怎么调用、该检查什么类型。调用出现在定义之前又没声明，老编译器会按 return int 猜，现代 C 直接报错。" },

    { Q_BUG,
      "这段代码死循环了。点出问题所在的行：",
      "#include <stdio.h>\n"
      "\n"
      "int fact(int n) {\n"
      "    return n * fact(n - 1);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"%d\\n\", fact(4));\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      3,
      "递归缺少终止条件：n 会一路减到负数还继续调，栈被压满后程序崩溃。任何递归都必须有\"什么情况下不再递归\"的判断。" }
};

static const Question ch7_qs[] = {
    { Q_OUTPUT,
      "通过指针改值：",
      "#include <stdio.h>\n"
      "\n"
      "void set(int *p) {\n"
      "    *p = 42;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int a = 7;\n"
      "    set(&a);\n"
      "    printf(\"%d\\n\", a);\n"
      "    return 0;\n"
      "}",
      { "7", "42", "0", "编译错误" },
      1,
      "&a 把 a 的地址传进去，*p = 42 就是往那个地址里写 42，改到的是真正的 a。这就是\"传地址\"能让函数改变外部变量的原因。" },

    { Q_OUTPUT,
      "指针的算术运算：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[5] = {10, 20, 30, 40, 50};\n"
      "    int *p = a;\n"
      "    printf(\"%d\\n\", *(p + 2));\n"
      "    return 0;\n"
      "}",
      { "30", "20", "10", "12" },
      0,
      "数组名退化成首元素地址，p = a 指向 a[0]。指针 + 2 不是加 2 个字节，而是往后移动 2 个元素，所以 *(p+2) 就是 a[2] = 30。" },

    { Q_OUTPUT,
      "指针先自增再取值：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a[3] = {5, 6, 7};\n"
      "    int *p = a;\n"
      "    p++;\n"
      "    printf(\"%d\\n\", *p);\n"
      "    return 0;\n"
      "}",
      { "5", "7", "地址值", "6" },
      3,
      "p++ 让指针跳到下一个元素（a[1]），再解引用拿到 6。注意 p++ 的值取决于位置：(*p)++ 是改元素的值，*p++ 是移动指针。" },

    { Q_OUTPUT,
      "交换两个数（正确的指针版）：",
      "#include <stdio.h>\n"
      "\n"
      "void swap(int *a, int *b) {\n"
      "    int t = *a;\n"
      "    *a = *b;\n"
      "    *b = t;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int x = 1, y = 2;\n"
      "    swap(&x, &y);\n"
      "    printf(\"%d %d\\n\", x, y);\n"
      "    return 0;\n"
      "}",
      { "1 2", "2 2", "2 1", "1 1" },
      2,
      "交换成功：x 变 2、y 变 1。如果参数写成 int a, int b（值传递），交换的只是副本，外面纹丝不动——这是指针最经典的用途。" },

    { Q_OUTPUT,
      "NULL 指针解引用会怎样？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int *p = NULL;\n"
      "    if (p != NULL) {\n"
      "        printf(\"%d\\n\", *p);\n"
      "    } else {\n"
      "        printf(\"null\\n\");\n"
      "    }\n"
      "    return 0;\n"
      "}",
      { "0", "null", "崩溃", "编译错误" },
      1,
      "先判断再解引用，这是正确姿势，所以安全地打印 null。如果直接 *p 就会访问 0 号地址，程序崩溃（段错误 / 访问冲突）。用指针前先判空是好习惯。" },

    { Q_CHOICE,
      "int *p = &a; 中，*p 表示什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a = 7;\n"
      "    int *p = &a;\n"
      "    printf(\"%d\\n\", *p);\n"
      "    return 0;\n"
      "}",
      { "p 所指向的那个变量的值", "p 自己的地址", "a 的地址", "一个叫 p 的数组" },
      0,
      "* 是\"解引用\"运算符，*p 就是顺着 p 存的地址去取那个变量。& 是取地址，两者互为逆操作。指针变量本身占 8 字节（64 位系统）。" },

    { Q_BUG,
      "经典指针错误，点出问题所在的行：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int *p;\n"
      "    *p = 5;\n"
      "    printf(\"%d\\n\", *p);\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      4,
      "p 是野指针：没初始化，里面是随机地址，往那儿写 5 属于未定义行为，可能崩溃、可能悄悄写坏别处。使用前必须让它指向有效内存（int x; p = &x; 或 p = malloc(...)）。" }
};

static const Question ch8_qs[] = {
    { Q_OUTPUT,
      "strlen 算不算结尾的 \\0？",
      "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[] = \"abc\";\n"
      "    printf(\"%d\\n\", (int)strlen(s));\n"
      "    return 0;\n"
      "}",
      { "3", "4", "2", "随机值" },
      0,
      "strlen 数的是 \\0 之前的字符个数，所以是 3。但数组 s 实际占 4 个字节（'a'、'b'、'c'、'\\0'），这个区别在申请空间时非常致命——忘了留 \\0 的位置就会越界。" },

    { Q_OUTPUT,
      "sizeof 和 strlen 差多少？",
      "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[] = \"abc\";\n"
      "    printf(\"%d %d\\n\", (int)sizeof(s), (int)strlen(s));\n"
      "    return 0;\n"
      "}",
      { "3 3", "4 4", "3 4", "4 3" },
      3,
      "sizeof 算的是整个数组占多少字节，包含 \\0，得 4；strlen 算的是可见字符数，得 3。sizeof 是编译期算子，strlen 是运行时函数。" },

    { Q_OUTPUT,
      "改字符数组里的一个字符：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[] = \"hello\";\n"
      "    s[0] = 'H';\n"
      "    printf(\"%s\\n\", s);\n"
      "    return 0;\n"
      "}",
      { "hello", "H", "Hello", "编译错误" },
      2,
      "s 是可修改的字符数组，s[0] 改成功，打印 Hello。但如果是 char *s = \"hello\"; s[0] = 'H'; 就会崩——指针指向的是只读的字符串常量区。" },

    { Q_OUTPUT,
      "字符串比较用哪个？",
      "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char a[] = \"apple\";\n"
      "    char b[] = \"apple\";\n"
      "    printf(\"%d %d\\n\", a == b, strcmp(a, b) == 0);\n"
      "    return 0;\n"
      "}",
      { "1 1", "0 1", "0 0", "1 0" },
      1,
      "两个不同的数组，a == b 比的是地址，当然不等，得 0。strcmp 才逐字符比内容，相等返回 0。比较字符串永远用 strcmp，别用 ==。" },

    { Q_OUTPUT,
      "复制字符串的正确做法：",
      "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char dst[16];\n"
      "    strcpy(dst, \"C\");\n"
      "    strcat(dst, \" language\");\n"
      "    printf(\"%s\\n\", dst);\n"
      "    return 0;\n"
      "}",
      { "C language", "C", "language", "C language " },
      0,
      "strcpy 把 \"C\" 拷进 dst（含 \\0），strcat 再从 dst 末尾的 \\0 处接着拼上 \" language\"，结果是 C language，共 10 个字符，16 字节够放。" },

    { Q_CHOICE,
      "字符串 \"abc\" 在内存里实际占几个字节？",
      "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[] = \"abc\";\n"
      "    printf(\"%d %d\\n\", (int)sizeof(s), (int)strlen(s));\n"
      "    return 0;\n"
      "}",
      { "3", "6", "不确定", "4" },
      3,
      "a、b、c、\\0 共 4 个字节。\\0 是字符串的结束标志，printf / strlen / strcpy 这些函数全靠它知道\"到这儿结束了\"，少了它就会一直读下去。" },

    { Q_BUG,
      "字符串改了会崩溃，点出问题所在的行：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    char *s = \"hello\";\n"
      "    s[0] = 'H';\n"
      "    printf(\"%s\\n\", s);\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      4,
      "指针指向的是程序里的只读字符串常量，\"hello\" 存在只读区，写它就会触发访问违规。要能改就改成数组：char s[] = \"hello\"; 那样数据会拷到栈上的可写数组里。" }
};

static const Question ch9_qs[] = {
    { Q_OUTPUT,
      "用 . 访问结构体成员：",
      "#include <stdio.h>\n"
      "\n"
      "struct Point {\n"
      "    int x;\n"
      "    int y;\n"
      "};\n"
      "\n"
      "int main(void) {\n"
      "    struct Point p = {3, 4};\n"
      "    printf(\"%d\\n\", p.x + p.y);\n"
      "    return 0;\n"
      "}",
      { "34", "3", "4", "7" },
      3,
      "{3, 4} 按顺序初始化 x = 3、y = 4，相加得 7。用普通变量访问成员用 .，用指针访问才用 ->。" },

    { Q_OUTPUT,
      "用指针访问结构体成员：",
      "#include <stdio.h>\n"
      "\n"
      "struct Point {\n"
      "    int x;\n"
      "    int y;\n"
      "};\n"
      "\n"
      "int main(void) {\n"
      "    struct Point p = {3, 4};\n"
      "    struct Point *pp = &p;\n"
      "    pp->x = 10;\n"
      "    printf(\"%d %d\\n\", p.x, pp->y);\n"
      "    return 0;\n"
      "}",
      { "3 4", "10 10", "10 4", "编译错误" },
      2,
      "pp->x 等价于 (*pp).x，改的是 p 的 x，所以 p.x 变 10；y 没动还是 4。-> 是访问指针所指结构体成员的专用写法，比 (*pp).x 好读。" },

    { Q_OUTPUT,
      "结构体数组：",
      "#include <stdio.h>\n"
      "\n"
      "typedef struct {\n"
      "    char name[8];\n"
      "    int score;\n"
      "} Student;\n"
      "\n"
      "int main(void) {\n"
      "    Student a[2] = {{\"Amy\", 90}, {\"Bob\", 85}};\n"
      "    printf(\"%s %d\\n\", a[1].name, a[0].score);\n"
      "    return 0;\n"
      "}",
      { "Amy 90", "Bob 90", "Bob 85", "Amy 85" },
      1,
      "a[1] 是第二个学生 Bob，a[0].score 是第一个学生的 90。typedef 之后就不用每次写 struct Student 了，直接 Student 就行。" },

    { Q_OUTPUT,
      "结构体可以直接赋值吗？",
      "#include <stdio.h>\n"
      "\n"
      "typedef struct { int a, b; } Pair;\n"
      "\n"
      "int main(void) {\n"
      "    Pair p1 = {1, 2};\n"
      "    Pair p2 = p1;\n"
      "    p2.a = 99;\n"
      "    printf(\"%d %d\\n\", p1.a, p2.a);\n"
      "    return 0;\n"
      "}",
      { "1 99", "99 99", "1 2", "99 1" },
      0,
      "同类型结构体可以直接 = 赋值，做的是逐成员的\"浅拷贝\"，p2 是独立的一份。所以改 p2.a 不影响 p1.a。但如果成员里有指针，拷的只是指针，两边仍指向同一块内存——那就要小心了。" },

    { Q_OUTPUT,
      "结构体作为函数参数：",
      "#include <stdio.h>\n"
      "\n"
      "typedef struct { int x, y; } P;\n"
      "\n"
      "int sum(P p) {\n"
      "    p.x = 100;\n"
      "    return p.x + p.y;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    P p = {1, 2};\n"
      "    printf(\"%d %d\\n\", sum(p), p.x);\n"
      "    return 0;\n"
      "}",
      { "3 1", "102 100", "3 100", "102 1" },
      3,
      "结构体当普通参数传递时也是值传递，改的是拷贝，所以外面的 p.x 还是 1。函数内把 x 改成 100，返回 100 + 2 = 102。想改原结构体就传指针 P *p。" },

    { Q_CHOICE,
      "typedef struct { int x; } A; 这行的作用是？",
      "#include <stdio.h>\n"
      "\n"
      "typedef struct { int x; } A;\n"
      "\n"
      "int main(void) {\n"
      "    A s;\n"
      "    s.x = 5;\n"
      "    printf(\"%d\\n\", s.x);\n"
      "    return 0;\n"
      "}",
      { "定义了一个叫 A 的结构体变量", "声明了一个指向结构体的指针", "给这个结构体类型起了个别名 A", "创建了一个数组 A" },
      2,
      "typedef 是给类型起别名，之后可以直接写 A s; 而不是 struct { int x; } s;。它是类型层面的操作，不分配任何内存，也不产生变量。" },

    { Q_BUG,
      "编译报错，点出问题所在的行：",
      "#include <stdio.h>\n"
      "\n"
      "struct Point {\n"
      "    int x;\n"
      "    int y;\n"
      "};\n"
      "\n"
      "int main(void) {\n"
      "    struct Point p = {1, 2};\n"
      "    p->x = 5;\n"
      "    printf(\"%d\\n\", p.x);\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      9,
      "p 是普通结构体变量，不是指针，访问成员要用 p.x。-> 只能用在指针上（比如 &p 给了指针变量 pp 之后 pp->x）。编译器会报\"p 不是指针\"一类的错。" }
};

static const Question ch10_qs[] = {
    { Q_OUTPUT,
      "fopen 失败时会返回什么？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    FILE *fp = fopen(\"no_such_file_12345.txt\", \"r\");\n"
      "    if (fp == NULL) {\n"
      "        printf(\"open failed\\n\");\n"
      "    } else {\n"
      "        printf(\"ok\\n\");\n"
      "        fclose(fp);\n"
      "    }\n"
      "    return 0;\n"
      "}",
      { "ok", "崩溃", "open failed", "编译错误" },
      2,
      "文件不存在时 fopen 返回 NULL。所以每次 fopen 之后都要判空，否则后面 fp 为 NULL 还去读写就会崩。" },

    { Q_OUTPUT,
      "fprintf 和 printf 的区别：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    FILE *fp = fopen(\"_t_demo.txt\", \"w\");\n"
      "    fprintf(fp, \"%d\\n\", 42);\n"
      "    fclose(fp);\n"
      "\n"
      "    fp = fopen(\"_t_demo.txt\", \"r\");\n"
      "    int v = 0;\n"
      "    fscanf(fp, \"%d\", &v);\n"
      "    fclose(fp);\n"
      "    printf(\"%d\\n\", v);\n"
      "    remove(\"_t_demo.txt\");\n"
      "    return 0;\n"
      "}",
      { "0", "42", "42\\n", "编译错误" },
      1,
      "fprintf 第一个参数是要写的文件，其余和 printf 一样；读回来用 fscanf，注意要传 &v（地址）。写进去的是文本 \"42\\n\"，读出来转成整数 42 打印，结果就是 42。" },

    { Q_OUTPUT,
      "\"w\" 和 \"a\" 打开方式的区别：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    FILE *fp = fopen(\"_t_app.txt\", \"w\");\n"
      "    fprintf(fp, \"A\");\n"
      "    fclose(fp);\n"
      "\n"
      "    fp = fopen(\"_t_app.txt\", \"a\");\n"
      "    fprintf(fp, \"B\");\n"
      "    fclose(fp);\n"
      "\n"
      "    fp = fopen(\"_t_app.txt\", \"r\");\n"
      "    char buf[16] = {0};\n"
      "    fscanf(fp, \"%s\", buf);\n"
      "    fclose(fp);\n"
      "    printf(\"%s\\n\", buf);\n"
      "    remove(\"_t_app.txt\");\n"
      "    return 0;\n"
      "}",
      { "AB", "B", "A", "BA" },
      0,
      "\"w\" 会把文件清空再写，写入 A；\"a\" 是追加模式，在末尾接着写 B，得到 AB。要覆盖用 \"w\"，要继续往后写用 \"a\"。" },

    { Q_OUTPUT,
      "用 \"r\" 打开一个不存在的文件？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    FILE *fp = fopen(\"definitely_missing_999.txt\", \"w\");\n"
      "    if (fp == NULL) {\n"
      "        printf(\"null\\n\");\n"
      "        return 0;\n"
      "    }\n"
      "    fclose(fp);\n"
      "    remove(\"definitely_missing_999.txt\");\n"
      "    printf(\"created\\n\");\n"
      "    return 0;\n"
      "}",
      { "null", "崩溃", "编译错误", "created" },
      3,
      "用 \"w\" 打开不存在的文件会自动创建，所以不会返回 NULL，打印 created。只有当路径非法、没权限、或者用 \"r\" 打开不存在的文件时才会返回 NULL。" },

    { Q_OUTPUT,
      "读文件要按什么方式打开？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    FILE *fw = fopen(\"_t_r.txt\", \"w\");\n"
      "    fprintf(fw, \"%d %d\\n\", 3, 9);\n"
      "    fclose(fw);\n"
      "\n"
      "    FILE *fr = fopen(\"_t_r.txt\", \"r\");\n"
      "    int a = 0, b = 0;\n"
      "    fscanf(fr, \"%d %d\", &a, &b);\n"
      "    fclose(fr);\n"
      "    remove(\"_t_r.txt\");\n"
      "    printf(\"%d\\n\", a * b);\n"
      "    return 0;\n"
      "}",
      { "3", "9", "27", "12" },
      2,
      "读文件必须用 \"r\" 模式（\"w\" 会清空）。fscanf 按空白分隔读两个整数，得到 3 和 9，乘积 27。" },

    { Q_CHOICE,
      "文件用完为什么必须 fclose？",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    FILE *fp = fopen(\"out.txt\", \"w\");\n"
      "    fprintf(fp, \"data\\n\");\n"
      "    fclose(fp);\n"
      "    return 0;\n"
      "}",
      { "只是礼貌，可以不写", "把缓冲区里的数据真正写进磁盘，并释放文件句柄", "不关文件会被删除", "关掉后文件才能再打开" },
      1,
      "写文件是带缓冲的，数据先攒在内存里，fclose 时才刷盘；同时它释放系统句柄。程序正常退出通常会替你刷，但进程被强制杀掉、或者文件开太多超过上限时，不关就真出问题。" },

    { Q_BUG,
      "这段代码想写文件，但方式错了。点出真正有问题的那一行：",
      "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    FILE *fp = fopen(\"data.txt\", \"r\");\n"
      "    fprintf(fp, \"hello\\n\");\n"
      "    fclose(fp);\n"
      "    return 0;\n"
      "}",
      { "(运行时生成)", "(运行时生成)", "(运行时生成)", "(运行时生成)" },
      3,
      "用 \"r\" 是只读方式打开，却拿它 fprintf 往里写——根本写不进去。而且文件若不存在，fopen 返回 NULL，下一行 fprintf 直接崩溃。要写文件必须用 \"w\" 或 \"a\"，并且 fopen 之后先判空。" }
};


/* ---------- 实操题（由 build/gen-c-bank.js 自动生成） ---------- */
#define HANDS_COUNT 40

typedef struct {
    const char *title;
    const char *ch;
    const char *task;
    const char *detail;
    int         level;
} HandMeta;

typedef struct {
    const char *in;
    const char *expect;
} HandCase;

static const HandCase HANDS_CASES[40][4] = {
    { { "3 5\n", "5 3\n" }, { "-1 0\n", "0 -1\n" }, { "7 7\n", "7 7\n" }, { "", "" } },
    { { "0\n", "32.0\n" }, { "100\n", "212.0\n" }, { "-40\n", "-40.0\n" }, { "37\n", "98.6\n" } },
    { { "2024\n", "yes\n" }, { "2023\n", "no\n" }, { "1900\n", "no\n" }, { "2000\n", "yes\n" } },
    { { "3 5\n", "5 3\n" }, { "100 -7\n", "-7 100\n" }, { "", "" }, { "", "" } },
    { { "95\n", "A\n" }, { "90\n", "A\n" }, { "89\n", "B\n" }, { "60\n", "B\n" } },
    { { "3 + 4\n", "7\n" }, { "10 - 25\n", "-15\n" }, { "6 * 7\n", "42\n" }, { "7 / 2\n", "3.50\n" } },
    { { "1\n", "1\n" }, { "10\n", "55\n" }, { "100\n", "5050\n" }, { "", "" } },
    { { "3\n", "3*1=3 3*2=6 3*3=9 3*4=12 3*5=15 3*6=18 3*7=21 3*8=24 3*9=27\n" }, { "9\n", "9*1=9 9*2=18 9*3=27 9*4=36 9*5=45 9*6=54 9*7=63 9*8=72 9*9=81\n" }, { "", "" }, { "", "" } },
    { { "1230\n", "321\n" }, { "7\n", "7\n" }, { "0\n", "0\n" }, { "10000\n", "1\n" } },
    { { "5\n3 1 4 1 5\n", "5 1\n" }, { "1\n42\n", "42 42\n" }, { "4\n-5 -2 -9 -1\n", "-1 -9\n" }, { "", "" } },
    { { "5\n1 2 3 4 5\n", "5 4 3 2 1\n" }, { "4\n10 20 30 40\n", "40 30 20 10\n" }, { "1\n7\n", "7\n" }, { "", "" } },
    { { "5\n1 3 1 3 1\n", "0:0\n1:3\n2:0\n3:2\n4:0\n5:0\n6:0\n7:0\n8:0\n9:0\n" }, { "3\n0 0 9\n", "0:2\n1:0\n2:0\n3:0\n4:0\n5:0\n6:0\n7:0\n8:0\n9:1\n" }, { "", "" }, { "", "" } },
    { { "5\n", "5\n" }, { "-7\n", "7\n" }, { "0\n", "0\n" }, { "", "" } },
    { { "0\n", "0\n" }, { "1\n", "1\n" }, { "10\n", "55\n" }, { "20\n", "6765\n" } },
    { { "1 2\n", "2 1\n" }, { "-3 8\n", "8 -3\n" }, { "", "" }, { "", "" } },
    { { "5\n1 2 3 4 5\n", "2 3 4 5 6\n" }, { "3\n-1 0 9\n", "0 1 10\n" }, { "", "" }, { "", "" } },
    { { "hello\n", "5\n" }, { "c language\n", "10\n" }, { "a\n", "1\n" }, { "\n", "0\n" } },
    { { "abc\n", "cba\n" }, { "hello world\n", "dlrow olleh\n" }, { "x\n", "x\n" }, { "", "" } },
    { { "3\nAmy 90\nBob 85\nCid 95\n", "Cid\n" }, { "1\nSolo 60\n", "Solo\n" }, { "4\nA 10\nB 99\nC 50\nD 77\n", "B\n" }, { "", "" } },
    { { "4\n1 2 3 4\n", "10\n" }, { "3\n-5 10 5\n", "10\n" }, { "1\n42\n", "42\n" }, { "", "" } },
    { { "2 10\n", "1024\n" }, { "2 0\n", "1\n" }, { "3 5\n", "243\n" }, { "-2 3\n", "-8\n" } },
    { { "1\n", "1\nA->C\n" }, { "2\n", "3\nA->B\nA->C\nB->C\n" }, { "3\n", "7\nA->C\nA->B\nC->B\nA->C\nB->A\nB->C\nA->C\n" }, { "", "" } },
    { { "2\n2 1\n", "1 2\n2 1\n" }, { "3\n1 2 3\n", "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1\n" }, { "1\n7\n", "7\n" }, { "", "" } },
    { { "5\n3 1 4 1 5\n", "1 1 3 4 5\n3\n" }, { "3\n1 2 3\n", "1 2 3\n0\n" }, { "3\n3 2 1\n", "1 2 3\n3\n" }, { "1\n7\n", "7\n0\n" } },
    { { "5\n3 1 4 1 5\n", "1 1 3 4 5\n" }, { "1\n42\n", "42\n" }, { "6\n6 5 4 3 2 1\n", "1 2 3 4 5 6\n" }, { "4\n2 2 2 2\n", "2 2 2 2\n" } },
    { { "5 3\n1 2 3 4 5\n", "2\n" }, { "5 1\n1 2 3 4 5\n", "0\n" }, { "5 5\n1 2 3 4 5\n", "4\n" }, { "5 9\n1 2 3 4 5\n", "-1\n" } },
    { { "9\n", "3\n" }, { "8\n", "2\n" }, { "0\n", "0\n" }, { "1\n", "1\n" } },
    { { "1\n", "1\n" }, { "2\n", "2\n" }, { "3\n", "3\n" }, { "5\n", "8\n" } },
    { { "5\n1 -2 3 4 -1\n", "7\n" }, { "3\n-1 -2 -3\n", "-1\n" }, { "1\n-5\n", "-5\n" }, { "6\n2 -1 2 3 -9 4\n", "6\n" } },
    { { "3 10\n5 10\n4 40\n6 30\n", "70\n" }, { "1 5\n6 100\n", "0\n" }, { "3 5\n1 1\n2 2\n3 3\n", "5\n" }, { "4 10\n2 6\n2 3\n6 5\n5 4\n", "14\n" } },
    { { "5 9\n1 2 3 4 5\n", "3 4\n" }, { "5 100\n1 2 3 4 5\n", "no\n" }, { "2 3\n1 2\n", "0 1\n" }, { "4 6\n1 2 3 4\n", "1 3\n" } },
    { { "0\n", "0\n" }, { "1\n", "1\n" }, { "7\n", "3\n" }, { "1024\n", "1\n" } },
    { { "1 5\n", "41\n67\n34\n0\n69\n" }, { "42 3\n", "75\n0\n69\n" }, { "0 1\n", "38\n" }, { "", "" } },
    { { "5 5 3\n0 0\n1 1\n2 2\n", "1 2\n" }, { "3 3 8\n0 0\n0 1\n0 2\n1 0\n1 1\n1 2\n2 0\n2 1\n", "2 2\n" }, { "", "" }, { "", "" } },
    { { "", "[31mRED[0m\n[32mGREEN[0m\nDONE\n" }, { "", "" }, { "", "" }, { "", "" } },
    { { "", "[1;1H#[8;1H#[1;2H#[8;2H#[1;3H#[8;3H#[1;4H#[8;4H#[1;5H#[8;5H#[1;6H#[8;6H#[1;7H#[8;7H#[1;8H#[8;8H#[1;9H#[8;9H#[1;10H#[8;10H#[1;11H#[8;11H#[1;12H#[8;12H#[1;13H#[8;13H#[1;14H#[8;14H#[1;15H#[8;15H#[1;16H#[8;16H#[1;17H#[8;17H#[1;18H#[8;18H#[1;19H#[8;19H#[1;20H#[8;20H#[1;1H#[1;20H#[2;1H#[2;20H#[3;1H#[3;20H#[4;1H#[4;20H#[5;1H#[5;20H#[6;1H#[6;20H#[7;1H#[7;20H#[8;1H#[8;20H#[4;10H@" }, { "", "" }, { "", "" }, { "", "" } },
    { { "wwasd\n", "w:2\na:1\ns:1\nd:1\n最终方向:RIGHT\n" }, { "d\n", "w:0\na:0\ns:0\nd:1\n最终方向:RIGHT\n" }, { "as\n", "w:0\na:1\ns:1\nd:0\n最终方向:DOWN\n" }, { "", "" } },
    { { "3\n2 224 72\n2 224 80\n1 113\n", "UP\nDOWN\nUNKNOWN\n" }, { "3\n2 224 75\n2 224 77\n2 224 1\n", "LEFT\nRIGHT\nUNKNOWN\n" }, { "2\n1 224\n2 0 72\n", "UNKNOWN\nUP\n" }, { "", "" } },
    { { "5\n1 2 3 4 5\n", "15\n" }, { "1\n42\n", "42\n" }, { "3\n-1 0 1\n", "0\n" }, { "", "" } },
    { { "5\n1 2 3 4 5\n", "1 2 3 4 5\n" }, { "1\n9\n", "9\n" }, { "10\n1 2 3 4 5 6 7 8 9 10\n", "1 2 3 4 5 6 7 8 9 10\n" }, { "", "" } },
};

static const int HANDS_CASE_N[40] = { 3, 4, 4, 2, 6, 5, 3, 2, 4, 3, 3, 2, 3, 4, 2, 2, 4, 3, 3, 3, 6, 3, 3, 4, 4, 6, 5, 6, 5, 4, 4, 5, 3, 2, 1, 1, 3, 3, 3, 3 };

static const HandMeta HANDS[40] = {
    { "交换两个整数", "变量与类型",
      "读入两个整数 a 和 b，把它们交换后按 \"a b\" 的格式输出。",
      "输入：两个整数，空格或换行分隔。\n输出：交换后的两个数，中间一个空格，行尾换行。",
      1 },
    { "摄氏度转华氏度", "变量与类型",
      "读入一个摄氏温度（整数），输出对应的华氏温度，保留 1 位小数。",
      "公式：F = C × 9 / 5 + 32\n输入：一个整数。\n输出：华氏温度，保留 1 位小数，行尾换行。",
      1 },
    { "判断闰年", "运算符与表达式",
      "读入一个年份，闰年输出 \"yes\"，否则输出 \"no\"。",
      "闰年规则：能被 4 整除但不能被 100 整除，或者能被 400 整除。\n输入：一个正整数。\n输出：yes 或 no，行尾换行。",
      1 },
    { "不用临时变量交换", "运算符与表达式",
      "读入两个整数，不借助第三个变量，把它们交换后输出。",
      "输入：两个整数。\n输出：交换后的两个数，空格分隔。\n要求：代码里除了 a、b 不能声明别的变量来当中间人。",
      2 },
    { "成绩等级", "分支结构",
      "读入一个整数分数（0-100），按区间输出等级。",
      "90 及以上 → A\n60 到 89 → B\n60 以下 → C\n输入：一个整数。\n输出：一个大写字母，行尾换行。",
      1 },
    { "简单计算器", "分支结构",
      "读入「数 运算符 数」，输出运算结果。",
      "输入格式：a op b，其中 op 是 + - * / 之一（空格分隔）。\n"
      "输出：结果。加减乘输出整数；除法输出保留 2 位小数。\n"
      "注意：除法时如果除数是 0，输出 \"error\"。",
      2 },
    { "1 到 n 求和", "循环",
      "读入正整数 n，输出 1 + 2 + ... + n 的和。",
      "输入：一个正整数 n。\n输出：累加和，行尾换行。",
      1 },
    { "打印乘法表的一行", "循环",
      "读入一个整数 n（1-9），打印 n 的乘法口诀这一行。",
      "输出格式：n*1=结果 n*2=结果 ... n*9=结果\n"
      "每项之间一个空格，第 9 项后面直接换行，不要多余空格。\n"
      "例：输入 3，输出 3*1=3 3*2=6 ... 3*9=27",
      1 },
    { "倒序输出数字", "循环",
      "读入一个非负整数，把它的各位数字倒过来输出成一个数。",
      "输入：一个非负整数 n（可能以 0 结尾，如 1230）。\n输出：倒序后的数（前导零不输出）。\n例：1230 → 321，7 → 7，0 → 0",
      2 },
    { "求最大值和最小值", "数组",
      "读入 n 个整数，输出其中的最大值和最小值。",
      "第一行是整数 n，第二行是 n 个整数。\n输出：\"最大值 最小值\"，中间一个空格，行尾换行。",
      1 },
    { "数组逆置", "数组",
      "读入 n 个整数，把它们原地逆序后输出。",
      "输入：第一行 n，第二行 n 个整数。\n输出：逆序后的 n 个数，用一个空格分隔，行尾换行。\n要求：必须真的交换数组里的元素，不能只是倒着打印。",
      2 },
    { "统计每个数字出现次数", "数组",
      "读入 n 个 0-9 之间的数字，输出每个数字出现了几次。",
      "输入：第一行 n，第二行 n 个 0-9 的整数。\n"
      "输出：10 行，第 i 行是数字 i 出现的次数，格式 \"i:次数\"。\n"
      "例：输入 5 / 1 3 1 3 1，输出\n"
      "0:0\n"
      "1:3\n"
      "2:0\n"
      "3:2\n"
      "...\n"
      "9:0",
      3 },
    { "写一个求绝对值的函数", "函数",
      "补全函数 abs_int，返回整数的绝对值。",
      "main 已经写好了，读入一个整数并调用你的函数。\n输入：一个整数（可能是负数）。\n输出：它的绝对值。",
      1 },
    { "递归求斐波那契", "函数",
      "用递归实现 fib(n)，返回斐波那契数列第 n 项。",
      "定义：fib(0)=0, fib(1)=1, fib(n)=fib(n-1)+fib(n-2)。\n输入：一个非负整数 n。\n输出：第 n 项的值。",
      2 },
    { "用指针交换两个数", "指针",
      "补全函数 swap，通过指针交换两个整数。",
      "main 已经写好并调用 swap(&a, &b)。\n输入：两个整数。\n输出：交换后的两个数。",
      2 },
    { "用指针改数组", "指针",
      "补全函数 add_one，把数组里每个元素都加 1。只能用指针，不能用下标。",
      "main 已经写好了。\n输入：第一行 n，第二行 n 个整数。\n输出：每个数加 1 后的结果，空格分隔。",
      3 },
    { "统计字符个数", "字符与字符串",
      "读入一行字符串（可能含空格），输出它的长度。不能用 strlen。",
      "输入：一整行（最多 200 字符，不含换行符）。\n输出：字符个数（不含结尾的 \\0），行尾换行。",
      2 },
    { "把字符串倒过来", "字符与字符串",
      "读入一行字符串，把它反转后输出。",
      "输入：一整行（可能含空格）。\n输出：反转后的字符串，行尾换行。\n要求：交换数组里的字符，不能只是倒着打印。",
      3 },
    { "结构体存学生成绩", "结构体与 typedef",
      "定义结构体存学生姓名和分数，读入 n 个学生，输出分数最高的那个。",
      "输入：第一行 n；接下来 n 行，每行是「姓名 分数」（姓名不含空格）。\n输出：分数最高学生的姓名，行尾换行。\n分数互不相同。",
      2 },
    { "写入文件再读出来", "文件操作",
      "把读入的 n 个整数写进文件 numbers.txt，再读出来求和并输出。",
      "输入：第一行 n，第二行 n 个整数。\n输出：这些数的和，行尾换行。\n要求：必须真的用 fprintf 写文件、fscanf 读文件，最后删掉这个文件。",
      3 },
    { "递归求幂（快速幂）", "递归与回溯",
      "实现 pow_int(base, exp)，计算 base 的 exp 次方。要求用快速幂，不能循环 exp 次。",
      "输入：两个整数 base 和 exp（0 <= exp <= 30，|base| <= 10）。\n"
      "输出：base^exp 的值，行尾换行。\n"
      "要求：时间复杂度要 O(log exp)，不许写 for (i = 0; i < exp; i++) 那种线性循环。",
      3 },
    { "汉诺塔步数", "递归与回溯",
      "读入盘子数 n，输出把 n 个盘子从 A 柱移到 C 柱需要的步数，以及每一步怎么移。",
      "输入：一个整数 n（1 <= n <= 10）。\n"
      "输出：第一行是总步数；接下来每行一步，格式 \"A->C\"（从哪根柱到哪根柱）。\n"
      "柱子用 A、B、C 表示，规则是每次只能移一个盘、大盘不能压小盘。",
      3 },
    { "全排列", "递归与回溯",
      "读入 n 个不重复的数字，按字典序输出它们的全排列，每个排列一行。",
      "输入：第一行 n（1 <= n <= 6），第二行 n 个互不相同的整数。\n"
      "输出：所有全排列，每行一个，数字之间一个空格，按字典序排列。\n"
      "提示：先把数组排序，回溯时依次尝试每个没用过的数。",
      4 },
    { "冒泡排序（并统计交换次数）", "排序",
      "读入 n 个数，用冒泡排序升序排好并输出，同时输出总共发生了几次交换。",
      "输入：第一行 n（1 <= n <= 100），第二行 n 个整数。\n"
      "输出：第一行是排好序的数列（空格分隔）；第二行是交换次数。\n"
      "注意：必须是标准冒泡（相邻两个比较，逆序就换），别偷偷用 qsort。",
      3 },
    { "快速排序（自己实现 partition）", "排序",
      "读入 n 个数，用快速排序升序排好并输出。核心是 partition 函数要自己写。",
      "输入：第一行 n（1 <= n <= 200），第二行 n 个整数（可能重复）。\n"
      "输出：排好序的数列，空格分隔，行尾换行。\n"
      "要求：必须真的实现 quicksort（递归 + partition），不许用库里的排序函数。",
      4 },
    { "二分查找（返回下标）", "二分查找",
      "在一个升序数组里找目标值，返回它的下标（从 0 开始），找不到输出 -1。",
      "输入：第一行 n 和目标值 target；第二行 n 个升序整数。\n"
      "输出：target 的下标，或 -1，行尾换行。\n"
      "要求：必须用二分查找（O(log n)），不许从头到尾扫。",
      3 },
    { "二分答案：求平方根整数部分", "二分查找",
      "读入一个非负整数 x，输出 ⌊√x⌋（平方根的整数部分）。不许用 sqrt()。",
      "输入：一个非负整数 x（0 <= x <= 2,000,000,000）。\n"
      "输出：⌊√x⌋，行尾换行。\n"
      "要求：用二分答案的思路 —— 在 [0, x] 里二分找最大的 mid 使得 mid*mid <= x。\n"
      "注意 mid*mid 可能溢出 int，要用 long long。",
      5 },
    { "爬楼梯", "动态规划",
      "有 n 级台阶，每次可以走 1 级或 2 级，问有多少种不同的走法。",
      "输入：一个整数 n（1 <= n <= 40）。\n"
      "输出：走法总数，行尾换行。\n"
      "提示：f(n) = f(n-1) + f(n-2)，但请用循环而不是递归（递归会重复计算）。",
      3 },
    { "最大连续子段和", "动态规划",
      "读入 n 个整数（可能全为负），求连续子段的最大和。",
      "输入：第一行 n（1 <= n <= 100），第二行 n 个整数（|值| <= 1000）。\n"
      "输出：最大连续子段和，行尾换行。\n"
      "注意：子段必须非空。如果全是负数，答案就是最大的那个负数，不是 0。\n"
      "要求：用 O(n) 的 Kadane 算法。",
      4 },
    { "0-1 背包", "动态规划",
      "有 n 件物品，每件有重量和价值，背包容量为 W。每件最多拿一次，求能装下的最大价值。",
      "输入：第一行 n 和 W（1 <= n <= 50，1 <= W <= 1000）；接下来 n 行，每行是 \"重量 价值\"。\n"
      "输出：最大总价值，行尾换行。\n"
      "要求：用一维数组倒序更新的 0-1 背包写法。",
      5 },
    { "两数之和（有序数组）", "双指针",
      "在一个升序数组里找两个数，使它们的和等于 target，输出它们的下标。",
      "输入：第一行 n 和 target；第二行 n 个升序整数。\n"
      "输出：两个下标（小的在前），空格分隔；无解输出 \"no\"。\n"
      "要求：用双指针（O(n)），不许两层循环。\n"
      "保证最多只有一组解。",
      4 },
    { "统计二进制里 1 的个数", "位运算与综合",
      "读入一个非负整数，输出它二进制表示里有多少个 1。",
      "输入：一个非负整数 n（0 <= n <= 2^31-1）。\n"
      "输出：二进制中 1 的个数，行尾换行。\n"
      "要求：用 n &= (n - 1) 这个技巧，它每执行一次就消掉最低位的 1。\n"
      "（循环 32 次逐个检查也行，但要求用这个技巧。）",
      4 },
    { "用固定种子生成随机序列", "游戏·随机数",
      "读入一个种子 seed 和个数 n，用 srand(seed) 初始化后，连续输出 n 个 rand() % 100 的结果。",
      "输入：两个整数 seed 和 n（1 <= n <= 20）。\n"
      "输出：n 个 0~99 的随机数，每个一行。\n"
      "说明：srand 要在循环外只调用一次。同样的种子必须得到同样的序列——这是游戏\"可重现\"的基础（回放、测试都靠它）。",
      3 },
    { "随机坐标（避开已占格）", "游戏·随机数",
      "有一个 rows×cols 的棋盘，上面已有 k 个格子被占用。随机找一个空格，输出它的坐标。",
      "输入：第一行 rows cols k；接下来 k 行是两个整数 r c，表示被占用的格子。\n"
      "输出：一个空格的行列下标 \"r c\"。\n"
      "要求：用 srand(1) 固定随机序列（题目后面会比对输出，所以要确定）。\n"
      "做法：反复 rand 生成坐标，落在已占格就重来；找到空格才输出。",
      4 },
    { "ANSI 转义序列：给文字上色", "游戏·控制台",
      "按 ANSI 转义码输出三段带颜色的文字。",
      "输入：无。\n"
      "输出：依次输出下面三行（每行末尾都要有换行）：\n"
      "  1. 红色 \"RED\"\n"
      "  2. 绿色 \"GREEN\"\n"
      "  3. 恢复默认色后输出 \"DONE\"\n"
      "格式：用 \"\\033[31m\" 红色、\"\\033[32m\" 绿色、\"\\033[0m\" 恢复。\n"
      "注意：\\033 是八进制转义，在 C 里写作 \\033 或 \\x1B。",
      2 },
    { "用 gotoxy 画一个方框", "游戏·控制台",
      "用坐标定位，在 20×8 的区域内画一个边框，并在中心打一个 @。",
      "输入：无。\n"
      "输出：宽 20、高 8 的方框（# 组成），中心位置是 @。\n"
      "要求：用 SetConsoleCursorPosition 或 ANSI 定位来画，不能逐行 printf 拼。\n"
      "为了自动判分，请用 ANSI 序列 \\033[行;列H 定位（行、列都从 1 开始）。\n"
      "方框左上角定位在 (1,1)。",
      4 },
    { "把按键变成方向", "游戏·输入",
      "读入一串字符（w/a/s/d），把它翻译成方向数字，并统计各方几次。",
      "输入：一行字符（只含 w a s d，小写，长度 1~20）。\n"
      "输出：共 5 行。前 4 行是每个方向出现的次数，最后一行是最终方向。\n"
      "格式：\n"
      "  w:次数\n"
      "  a:次数\n"
      "  s:次数\n"
      "  d:次数\n"
      "  最终方向:UP / LEFT / DOWN / RIGHT\n"
      "规则：后出现的按键覆盖前面的（模拟\"按最后一次方向走\"）。\n"
      "如果没有按键，最终方向是 UP。",
      3 },
    { "处理方向键的双字节编码", "游戏·输入",
      "Windows 下方向键第一次读会返回 224，第二次才是真正的键码。模拟这个解码过程。",
      "输入：第一行 m（1~10）；接下来 m 行，每行是若干整数（代表从输入缓冲区读到的字节序列）。\n"
      "输出：每行输入解析出一个方向，输出 UP / DOWN / LEFT / RIGHT / UNKNOWN。\n"
      "规则：\n"
      "  - 遇到 224（或 0）时，它是方向键的前导字节，后面那个数才是键码\n"
      "  - 键码 72=UP, 80=DOWN, 75=LEFT, 77=RIGHT\n"
      "  - 其他键码输出 UNKNOWN\n"
      "  - 如果 224 之后再没有数了，输出 UNKNOWN",
      4 },
    { "用 malloc 建一个动态数组并释放", "游戏·内存",
      "读入 n，用 malloc 申请 n 个 int，读入数据求和，最后 free 掉。",
      "输入：第一行 n（1 <= n <= 100）；第二行 n 个整数。\n"
      "输出：总和，行尾换行。\n"
      "要求：必须用 malloc 分配，用 free 释放，不许用固定长度数组。\n"
      "注意malloc 返回 void*，要给 int* 转换；失败时返回 NULL 要判空。",
      4 },
    { "用 realloc 让数组变长", "游戏·内存",
      "读入一串数（个数事先不知道，第一行是 n），边读边用 realloc 扩容，最后输出。",
      "输入：第一行 n（1 <= n <= 50）；接下来 n 行，每行一个整数。\n"
      "输出：把这些数按读入顺序输出（空格分隔），行尾换行。\n"
      "要求：初始只申请 4 个元素，不够了用 realloc 翻倍。\n"
      "（这是\"扩容\"的思路——游戏里存不固定数量的对象都这么干。）",
      5 }
};

/* 每题的起手代码，运行时写到 practice.c */
static const char *HANDS_STARTER[40] = {
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a, b;\n"
      "    scanf(\"%d %d\", &a, &b);\n"
      "\n"
      "    /* TODO: 在这里交换 a 和 b */\n"
      "\n"
      "    printf(\"%d %d\\n\", a, b);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int c;\n"
      "    scanf(\"%d\", &c);\n"
      "\n"
      "    double f = 0.0;   /* TODO: 用公式算出 f */\n"
      "\n"
      "    printf(\"%.1f\\n\", f);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int y;\n"
      "    scanf(\"%d\", &y);\n"
      "\n"
      "    int leap = 0;   /* TODO: 判断 y 是不是闰年，是则置 1 */\n"
      "\n"
      "    if (leap)\n"
      "        printf(\"yes\\n\");\n"
      "    else\n"
      "        printf(\"no\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a, b;\n"
      "    scanf(\"%d %d\", &a, &b);\n"
      "\n"
      "    /* TODO: 只用 a 和 b 完成交换 */\n"
      "\n"
      "    printf(\"%d %d\\n\", a, b);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int s;\n"
      "    scanf(\"%d\", &s);\n"
      "\n"
      "    /* TODO: 按分数输出 A / B / C */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a, b;\n"
      "    char op;\n"
      "    scanf(\"%d %c %d\", &a, &op, &b);\n"
      "\n"
      "    /* TODO: 用 switch 或 if 处理四种运算 */\n"
      "    /* 提示：除法的结果要是小数 */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int sum = 0;\n"
      "    /* TODO: 用循环把 1 到 n 加起来 */\n"
      "\n"
      "    printf(\"%d\\n\", sum);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    /* TODO: 打印 n*1 到 n*9 */\n"
      "\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int rev = 0;\n"
      "    /* TODO: 反复取最后一位，拼到 rev 上 */\n"
      "\n"
      "    printf(\"%d\\n\", rev);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    /* TODO: 找出最大值和最小值 */\n"
      "\n"
      "    printf(\"%d %d\\n\", 0, 0);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    /* TODO: 交换 a[0] 和 a[n-1]、a[1] 和 a[n-2] ... */\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    /* TODO: 用一个大小为 10 的计数数组统计 */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int abs_int(int x) {\n"
      "    /* TODO: 返回 x 的绝对值 */\n"
      "    return 0;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    printf(\"%d\\n\", abs_int(n));\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int fib(int n) {\n"
      "    /* TODO: 递归实现 */\n"
      "    return 0;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    printf(\"%d\\n\", fib(n));\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void swap(int *pa, int *pb) {\n"
      "    /* TODO: 交换 *pa 和 *pb */\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int a, b;\n"
      "    scanf(\"%d %d\", &a, &b);\n"
      "    swap(&a, &b);\n"
      "    printf(\"%d %d\\n\", a, b);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void add_one(int *p, int n) {\n"
      "    /* TODO: 用指针遍历，把每个元素加 1\n"
      "       不许写 p[i] 或 *(p+i)，只能用 p++ 这种指针移动 */\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    add_one(a, n);\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[201];\n"
      "    fgets(s, sizeof(s), stdin);\n"
      "\n"
      "    /* TODO: 自己数有多少个字符（注意 fgets 会把换行也读进来） */\n"
      "\n"
      "    printf(\"%d\\n\", 0);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[201];\n"
      "    fgets(s, sizeof(s), stdin);\n"
      "\n"
      "    /* 先去掉末尾可能的换行符 */\n"
      "    int len = (int)strlen(s);\n"
      "    if (len > 0 && s[len - 1] == '\\n') {\n"
      "        s[len - 1] = '\\0';\n"
      "        len--;\n"
      "    }\n"
      "\n"
      "    /* TODO: 原地反转 s 的前 len 个字符 */\n"
      "\n"
      "    printf(\"%s\\n\", s);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "/* TODO: 定义 struct Student，包含 name 和 score */\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    /* TODO: 读入学生，找出分数最高的 */\n"
      "\n"
      "    printf(\"%s\\n\", \"?\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    /* TODO: 1. 用 \"w\" 打开 numbers.txt，把 n 和这些数写进去，关闭\n"
      "             2. 用 \"r\" 重新打开，读回来求和，关闭\n"
      "             3. remove(\"numbers.txt\")\n"
      "             4. 输出和 */\n"
      "\n"
      "    printf(\"%d\\n\", 0);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "long long pow_int(long long base, int exp) {\n"
      "    /* TODO: 快速幂\n"
      "       思路：base^exp =\n"
      "         exp 是偶数 -> (base^(exp/2))^2\n"
      "         exp 是奇数 -> base * base^(exp-1)\n"
      "       注意出口：exp == 0 时返回 1 */\n"
      "    return 0;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    long long base;\n"
      "    int exp;\n"
      "    scanf(\"%lld %d\", &base, &exp);\n"
      "    printf(\"%lld\\n\", pow_int(base, exp));\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "/* 把 n 个盘从 from 借 via 移到 to，同时打印每一步 */\n"
      "void hanoi(int n, char from, char via, char to) {\n"
      "    /* TODO: 三步走\n"
      "       1. 把上面 n-1 个从 from 移到 via（借 to）\n"
      "       2. 把最大的那个从 from 移到 to，打印这一步\n"
      "       3. 把 n-1 个从 via 移到 to（借 from） */\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    /* 总步数是 2^n - 1 */\n"
      "    int steps = 1;\n"
      "    for (int i = 0; i < n; i++) steps *= 2;\n"
      "    printf(\"%d\\n\", steps - 1);\n"
      "\n"
      "    hanoi(n, 'A', 'B', 'C');\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int n;\n"
      "int a[8];\n"
      "int used[8];\n"
      "int path[8];\n"
      "\n"
      "void dfs(int depth) {\n"
      "    if (depth == n) {\n"
      "        for (int i = 0; i < n; i++) {\n"
      "            if (i > 0) printf(\" \");\n"
      "            printf(\"%d\", path[i]);\n"
      "        }\n"
      "        printf(\"\\n\");\n"
      "        return;\n"
      "    }\n"
      "    /* TODO: 依次尝试每个还没用过的数\n"
      "       for (int i = 0; i < n; i++) {\n"
      "           if (used[i]) continue;\n"
      "           ... 选它、标记、递归、取消标记\n"
      "       } */\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    scanf(\"%d\", &n);\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    /* 先排序，保证输出是字典序 */\n"
      "    for (int i = 0; i < n - 1; i++)\n"
      "        for (int j = 0; j < n - 1 - i; j++)\n"
      "            if (a[j] > a[j + 1]) {\n"
      "                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;\n"
      "            }\n"
      "\n"
      "    dfs(0);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[105];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int swaps = 0;\n"
      "\n"
      "    /* TODO: 冒泡排序，每次真的交换 a[j] 和 a[j+1]，并让 swaps++ */\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n%d\\n\", swaps);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void swap(int *x, int *y) {\n"
      "    int t = *x; *x = *y; *y = t;\n"
      "}\n"
      "\n"
      "/* 以 a[hi] 为基准，把小的一拨放左边、大的一拨放右边，\n"
      "   返回基准最后待的位置 */\n"
      "int partition(int a[], int lo, int hi) {\n"
      "    /* TODO: 常用写法是 Lomuto：\n"
      "       pivot = a[hi]; i = lo - 1;\n"
      "       遍历 j 从 lo 到 hi-1，若 a[j] <= pivot 就 i++ 然后 swap(a[i], a[j]);\n"
      "       最后 swap(a[i+1], a[hi]); return i + 1; */\n"
      "    return lo;\n"
      "}\n"
      "\n"
      "void quicksort(int a[], int lo, int hi) {\n"
      "    if (lo >= hi) return;\n"
      "    int p = partition(a, lo, hi);\n"
      "    quicksort(a, lo, p - 1);\n"
      "    quicksort(a, p + 1, hi);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[205];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    quicksort(a, 0, n - 1);\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n, target;\n"
      "    scanf(\"%d %d\", &n, &target);\n"
      "    int a[205];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int lo = 0, hi = n - 1;\n"
      "    int ans = -1;\n"
      "\n"
      "    /* TODO: while (lo <= hi) { mid = (lo+hi)/2; ... } */\n"
      "\n"
      "    printf(\"%d\\n\", ans);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    long long x;\n"
      "    scanf(\"%lld\", &x);\n"
      "\n"
      "    long long lo = 0, hi = x, ans = 0;\n"
      "\n"
      "    /* TODO: 二分找最大的 mid 使 mid*mid <= x */\n"
      "\n"
      "    printf(\"%lld\\n\", ans);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    /* TODO: 用两个变量滚动递推。\n"
      "       f(1) = 1, f(2) = 2\n"
      "       之后 f(i) = f(i-1) + f(i-2) */\n"
      "\n"
      "    printf(\"%d\\n\", 0);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[105];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    /* TODO: Kadane\n"
      "       cur = 以当前位置结尾的最大和\n"
      "       best = 目前为止见过的最大和\n"
      "       cur = max(a[i], cur + a[i])   <- 关键：前面那段是\"拖累\"就丢掉 */\n"
      "\n"
      "    printf(\"%d\\n\", 0);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n, W;\n"
      "    scanf(\"%d %d\", &n, &W);\n"
      "\n"
      "    int wt[55], val[55];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d %d\", &wt[i], &val[i]);\n"
      "\n"
      "    int dp[1005] = {0};\n"
      "\n"
      "    /* TODO: 对每件物品，倒序遍历容量 w 从 W 到 wt[i]\n"
      "       dp[w] = max(dp[w], dp[w - wt[i]] + val[i])\n"
      "       倒序是为了保证每件物品只被用一次 */\n"
      "\n"
      "    printf(\"%d\\n\", dp[W]);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n, target;\n"
      "    scanf(\"%d %d\", &n, &target);\n"
      "    int a[205];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int l = 0, r = n - 1;\n"
      "    int found = 0;\n"
      "\n"
      "    /* TODO: 双指针\n"
      "       和太小 -> 左指针右移（需要更大的数）\n"
      "       和太大 -> 右指针左移（需要更小的数） */\n"
      "\n"
      "    if (!found) printf(\"no\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    unsigned int n;\n"
      "    scanf(\"%u\", &n);\n"
      "\n"
      "    int cnt = 0;\n"
      "\n"
      "    /* TODO: while (n) { n &= (n - 1); cnt++; } */\n"
      "\n"
      "    printf(\"%d\\n\", cnt);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <stdlib.h>\n"
      "\n"
      "int main(void) {\n"
      "    int seed, n;\n"
      "    scanf(\"%d %d\", &seed, &n);\n"
      "\n"
      "    /* TODO: 用 srand(seed) 初始化，然后循环 n 次输出 rand() % 100 */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <stdlib.h>\n"
      "\n"
      "int main(void) {\n"
      "    int rows, cols, k;\n"
      "    int used[50][50] = {0};\n"
      "    scanf(\"%d %d %d\", &rows, &cols, &k);\n"
      "\n"
      "    for (int i = 0; i < k; i++) {\n"
      "        int r, c;\n"
      "        scanf(\"%d %d\", &r, &c);\n"
      "        used[r][c] = 1;\n"
      "    }\n"
      "\n"
      "    srand(1);\n"
      "\n"
      "    /* TODO: 循环生成随机坐标，直到落在空格子上 */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    /* TODO: 用 \\033[31m 之类的转义序列输出三行 */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void gotoxy(int x, int y) {\n"
      "    /* ANSI 定位：行在前、列在后，都从 1 开始 */\n"
      "    printf(\"\\033[%d;%dH\", y, x);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int w = 20, h = 8;\n"
      "\n"
      "    /* TODO: 画上边框、下边框、左右边框，再在中心放 @ */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[32];\n"
      "    scanf(\"%s\", s);\n"
      "\n"
      "    /* TODO: 统计每个键的次数，并记录最后一次的方向 */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int m;\n"
      "    scanf(\"%d\", &m);\n"
      "\n"
      "    for (int i = 0; i < m; i++) {\n"
      "        int len;\n"
      "        int vals[10];\n"
      "\n"
      "        scanf(\"%d\", &len);\n"
      "        for (int j = 0; j < len; j++)\n"
      "            scanf(\"%d\", &vals[j]);\n"
      "\n"
      "        /* TODO: 解析这一行，输出一个方向 */\n"
      "    }\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <stdlib.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    /* TODO: int *a = malloc(n * sizeof(int)); 判空、读入、求和、free */\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <stdlib.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int cap = 4;\n"
      "    int cnt = 0;\n"
      "    int *a = (int *)malloc(cap * sizeof(int));\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        int v;\n"
      "        scanf(\"%d\", &v);\n"
      "\n"
      "        /* TODO: 如果 cnt == cap，用 realloc 把容量翻倍 */\n"
      "\n"
      "        a[cnt++] = v;\n"
      "    }\n"
      "\n"
      "    for (int i = 0; i < cnt; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "\n"
      "    free(a);\n"
      "    return 0;\n"
      "}"
};

/* 参考解答 */
static const char *HANDS_SOLUTION[40] = {
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a, b, t;\n"
      "    scanf(\"%d %d\", &a, &b);\n"
      "    t = a;\n"
      "    a = b;\n"
      "    b = t;\n"
      "    printf(\"%d %d\\n\", a, b);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int c;\n"
      "    scanf(\"%d\", &c);\n"
      "    double f = c * 9.0 / 5.0 + 32;\n"
      "    printf(\"%.1f\\n\", f);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int y;\n"
      "    scanf(\"%d\", &y);\n"
      "    int leap = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);\n"
      "    if (leap)\n"
      "        printf(\"yes\\n\");\n"
      "    else\n"
      "        printf(\"no\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a, b;\n"
      "    scanf(\"%d %d\", &a, &b);\n"
      "    a = a + b;\n"
      "    b = a - b;\n"
      "    a = a - b;\n"
      "    printf(\"%d %d\\n\", a, b);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int s;\n"
      "    scanf(\"%d\", &s);\n"
      "    if (s >= 90)\n"
      "        printf(\"A\\n\");\n"
      "    else if (s >= 60)\n"
      "        printf(\"B\\n\");\n"
      "    else\n"
      "        printf(\"C\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int a, b;\n"
      "    char op;\n"
      "    scanf(\"%d %c %d\", &a, &op, &b);\n"
      "\n"
      "    switch (op) {\n"
      "        case '+': printf(\"%d\\n\", a + b); break;\n"
      "        case '-': printf(\"%d\\n\", a - b); break;\n"
      "        case '*': printf(\"%d\\n\", a * b); break;\n"
      "        case '/':\n"
      "            if (b == 0)\n"
      "                printf(\"error\\n\");\n"
      "            else\n"
      "                printf(\"%.2f\\n\", (double)a / b);\n"
      "            break;\n"
      "        default:\n"
      "            printf(\"error\\n\");\n"
      "    }\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int sum = 0;\n"
      "    for (int i = 1; i <= n; i++)\n"
      "        sum += i;\n"
      "    printf(\"%d\\n\", sum);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    for (int i = 1; i <= 9; i++) {\n"
      "        if (i > 1) printf(\" \");\n"
      "        printf(\"%d*%d=%d\", n, i, n * i);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int rev = 0;\n"
      "    do {\n"
      "        rev = rev * 10 + n % 10;\n"
      "        n /= 10;\n"
      "    } while (n > 0);\n"
      "    printf(\"%d\\n\", rev);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int mx = a[0], mn = a[0];\n"
      "    for (int i = 1; i < n; i++) {\n"
      "        if (a[i] > mx) mx = a[i];\n"
      "        if (a[i] < mn) mn = a[i];\n"
      "    }\n"
      "    printf(\"%d %d\\n\", mx, mn);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    for (int i = 0; i < n / 2; i++) {\n"
      "        int t = a[i];\n"
      "        a[i] = a[n - 1 - i];\n"
      "        a[n - 1 - i] = t;\n"
      "    }\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int cnt[10] = {0};\n"
      "    for (int i = 0; i < n; i++)\n"
      "        cnt[a[i]]++;\n"
      "\n"
      "    for (int i = 0; i < 10; i++)\n"
      "        printf(\"%d:%d\\n\", i, cnt[i]);\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int abs_int(int x) {\n"
      "    if (x < 0)\n"
      "        return -x;\n"
      "    return x;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    printf(\"%d\\n\", abs_int(n));\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int fib(int n) {\n"
      "    if (n <= 1)\n"
      "        return n;\n"
      "    return fib(n - 1) + fib(n - 2);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    printf(\"%d\\n\", fib(n));\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void swap(int *pa, int *pb) {\n"
      "    int t = *pa;\n"
      "    *pa = *pb;\n"
      "    *pb = t;\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int a, b;\n"
      "    scanf(\"%d %d\", &a, &b);\n"
      "    swap(&a, &b);\n"
      "    printf(\"%d %d\\n\", a, b);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void add_one(int *p, int n) {\n"
      "    int *end = p + n;\n"
      "    while (p < end) {\n"
      "        *p = *p + 1;\n"
      "        p++;\n"
      "    }\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    add_one(a, n);\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[201];\n"
      "    fgets(s, sizeof(s), stdin);\n"
      "\n"
      "    int len = 0;\n"
      "    while (s[len] != '\\0' && s[len] != '\\n')\n"
      "        len++;\n"
      "\n"
      "    printf(\"%d\\n\", len);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[201];\n"
      "    fgets(s, sizeof(s), stdin);\n"
      "\n"
      "    int len = (int)strlen(s);\n"
      "    if (len > 0 && s[len - 1] == '\\n') {\n"
      "        s[len - 1] = '\\0';\n"
      "        len--;\n"
      "    }\n"
      "\n"
      "    for (int i = 0; i < len / 2; i++) {\n"
      "        char t = s[i];\n"
      "        s[i] = s[len - 1 - i];\n"
      "        s[len - 1 - i] = t;\n"
      "    }\n"
      "\n"
      "    printf(\"%s\\n\", s);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "typedef struct {\n"
      "    char name[32];\n"
      "    int score;\n"
      "} Student;\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    Student s[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%s %d\", s[i].name, &s[i].score);\n"
      "\n"
      "    int best = 0;\n"
      "    for (int i = 1; i < n; i++) {\n"
      "        if (s[i].score > s[best].score)\n"
      "            best = i;\n"
      "    }\n"
      "\n"
      "    printf(\"%s\\n\", s[best].name);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int a[100];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d\", &a[i]);\n"
      "\n"
      "    FILE *fp = fopen(\"numbers.txt\", \"w\");\n"
      "    if (fp == NULL) return 1;\n"
      "    for (int i = 0; i < n; i++)\n"
      "        fprintf(fp, \"%d \", a[i]);\n"
      "    fclose(fp);\n"
      "\n"
      "    fp = fopen(\"numbers.txt\", \"r\");\n"
      "    if (fp == NULL) return 1;\n"
      "    int sum = 0, v;\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (fscanf(fp, \"%d\", &v) != 1) break;\n"
      "        sum += v;\n"
      "    }\n"
      "    fclose(fp);\n"
      "\n"
      "    remove(\"numbers.txt\");\n"
      "    printf(\"%d\\n\", sum);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "long long pow_int(long long base, int exp) {\n"
      "    if (exp == 0) return 1;\n"
      "    if (exp % 2 == 0) {\n"
      "        long long half = pow_int(base, exp / 2);\n"
      "        return half * half;\n"
      "    }\n"
      "    return base * pow_int(base, exp - 1);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    long long base;\n"
      "    int exp;\n"
      "    scanf(\"%lld %d\", &base, &exp);\n"
      "    printf(\"%lld\\n\", pow_int(base, exp));\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void hanoi(int n, char from, char via, char to) {\n"
      "    if (n == 0) return;\n"
      "    hanoi(n - 1, from, to, via);\n"
      "    printf(\"%c->%c\\n\", from, to);\n"
      "    hanoi(n - 1, via, from, to);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int steps = 1;\n"
      "    for (int i = 0; i < n; i++) steps *= 2;\n"
      "    printf(\"%d\\n\", steps - 1);\n"
      "    hanoi(n, 'A', 'B', 'C');\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int n;\n"
      "int a[8];\n"
      "int used[8];\n"
      "int path[8];\n"
      "\n"
      "void dfs(int depth) {\n"
      "    if (depth == n) {\n"
      "        for (int i = 0; i < n; i++) {\n"
      "            if (i > 0) printf(\" \");\n"
      "            printf(\"%d\", path[i]);\n"
      "        }\n"
      "        printf(\"\\n\");\n"
      "        return;\n"
      "    }\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (used[i]) continue;\n"
      "        used[i] = 1;\n"
      "        path[depth] = a[i];\n"
      "        dfs(depth + 1);\n"
      "        used[i] = 0;\n"
      "    }\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    scanf(\"%d\", &n);\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    for (int i = 0; i < n - 1; i++)\n"
      "        for (int j = 0; j < n - 1 - i; j++)\n"
      "            if (a[j] > a[j + 1]) {\n"
      "                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;\n"
      "            }\n"
      "\n"
      "    dfs(0);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[105];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int swaps = 0;\n"
      "    for (int i = 0; i < n - 1; i++) {\n"
      "        for (int j = 0; j < n - 1 - i; j++) {\n"
      "            if (a[j] > a[j + 1]) {\n"
      "                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;\n"
      "                swaps++;\n"
      "            }\n"
      "        }\n"
      "    }\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n%d\\n\", swaps);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void swap(int *x, int *y) {\n"
      "    int t = *x; *x = *y; *y = t;\n"
      "}\n"
      "\n"
      "int partition(int a[], int lo, int hi) {\n"
      "    int pivot = a[hi];\n"
      "    int i = lo - 1;\n"
      "    for (int j = lo; j < hi; j++) {\n"
      "        if (a[j] <= pivot) {\n"
      "            i++;\n"
      "            swap(&a[i], &a[j]);\n"
      "        }\n"
      "    }\n"
      "    swap(&a[i + 1], &a[hi]);\n"
      "    return i + 1;\n"
      "}\n"
      "\n"
      "void quicksort(int a[], int lo, int hi) {\n"
      "    if (lo >= hi) return;\n"
      "    int p = partition(a, lo, hi);\n"
      "    quicksort(a, lo, p - 1);\n"
      "    quicksort(a, p + 1, hi);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[205];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    quicksort(a, 0, n - 1);\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n, target;\n"
      "    scanf(\"%d %d\", &n, &target);\n"
      "    int a[205];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int lo = 0, hi = n - 1;\n"
      "    int ans = -1;\n"
      "\n"
      "    while (lo <= hi) {\n"
      "        int mid = lo + (hi - lo) / 2;\n"
      "        if (a[mid] == target) { ans = mid; break; }\n"
      "        else if (a[mid] < target) lo = mid + 1;\n"
      "        else hi = mid - 1;\n"
      "    }\n"
      "\n"
      "    printf(\"%d\\n\", ans);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    long long x;\n"
      "    scanf(\"%lld\", &x);\n"
      "\n"
      "    long long lo = 0, hi = x, ans = 0;\n"
      "\n"
      "    while (lo <= hi) {\n"
      "        long long mid = lo + (hi - lo) / 2;\n"
      "        if (mid * mid <= x) {\n"
      "            ans = mid;\n"
      "            lo = mid + 1;\n"
      "        } else {\n"
      "            hi = mid - 1;\n"
      "        }\n"
      "    }\n"
      "\n"
      "    printf(\"%lld\\n\", ans);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    if (n == 1) { printf(\"1\\n\"); return 0; }\n"
      "    if (n == 2) { printf(\"2\\n\"); return 0; }\n"
      "\n"
      "    long long a = 1, b = 2;\n"
      "    for (int i = 3; i <= n; i++) {\n"
      "        long long c = a + b;\n"
      "        a = b;\n"
      "        b = c;\n"
      "    }\n"
      "    printf(\"%lld\\n\", b);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "    int a[105];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int cur = a[0], best = a[0];\n"
      "    for (int i = 1; i < n; i++) {\n"
      "        cur = (cur + a[i] > a[i]) ? (cur + a[i]) : a[i];\n"
      "        if (cur > best) best = cur;\n"
      "    }\n"
      "\n"
      "    printf(\"%d\\n\", best);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n, W;\n"
      "    scanf(\"%d %d\", &n, &W);\n"
      "\n"
      "    int wt[55], val[55];\n"
      "    for (int i = 0; i < n; i++)\n"
      "        scanf(\"%d %d\", &wt[i], &val[i]);\n"
      "\n"
      "    int dp[1005] = {0};\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        for (int w = W; w >= wt[i]; w--) {\n"
      "            int take = dp[w - wt[i]] + val[i];\n"
      "            if (take > dp[w]) dp[w] = take;\n"
      "        }\n"
      "    }\n"
      "\n"
      "    printf(\"%d\\n\", dp[W]);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n, target;\n"
      "    scanf(\"%d %d\", &n, &target);\n"
      "    int a[205];\n"
      "    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n"
      "\n"
      "    int l = 0, r = n - 1;\n"
      "    int found = 0;\n"
      "\n"
      "    while (l < r) {\n"
      "        int s = a[l] + a[r];\n"
      "        if (s == target) {\n"
      "            printf(\"%d %d\\n\", l, r);\n"
      "            found = 1;\n"
      "            break;\n"
      "        } else if (s < target) {\n"
      "            l++;\n"
      "        } else {\n"
      "            r--;\n"
      "        }\n"
      "    }\n"
      "\n"
      "    if (!found) printf(\"no\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    unsigned int n;\n"
      "    scanf(\"%u\", &n);\n"
      "\n"
      "    int cnt = 0;\n"
      "    while (n) {\n"
      "        n &= (n - 1);\n"
      "        cnt++;\n"
      "    }\n"
      "\n"
      "    printf(\"%d\\n\", cnt);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <stdlib.h>\n"
      "\n"
      "int main(void) {\n"
      "    int seed, n;\n"
      "    scanf(\"%d %d\", &seed, &n);\n"
      "\n"
      "    srand(seed);\n"
      "    for (int i = 0; i < n; i++)\n"
      "        printf(\"%d\\n\", rand() % 100);\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <stdlib.h>\n"
      "\n"
      "int main(void) {\n"
      "    int rows, cols, k;\n"
      "    int used[50][50] = {0};\n"
      "    scanf(\"%d %d %d\", &rows, &cols, &k);\n"
      "\n"
      "    for (int i = 0; i < k; i++) {\n"
      "        int r, c;\n"
      "        scanf(\"%d %d\", &r, &c);\n"
      "        used[r][c] = 1;\n"
      "    }\n"
      "\n"
      "    srand(1);\n"
      "\n"
      "    int r, c;\n"
      "    do {\n"
      "        r = rand() % rows;\n"
      "        c = rand() % cols;\n"
      "    } while (used[r][c]);\n"
      "\n"
      "    printf(\"%d %d\\n\", r, c);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    printf(\"\\033[31mRED\\033[0m\\n\");\n"
      "    printf(\"\\033[32mGREEN\\033[0m\\n\");\n"
      "    printf(\"DONE\\n\");\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "void gotoxy(int x, int y) {\n"
      "    printf(\"\\033[%d;%dH\", y, x);\n"
      "}\n"
      "\n"
      "int main(void) {\n"
      "    int w = 20, h = 8;\n"
      "    int x, y;\n"
      "\n"
      "    for (x = 1; x <= w; x++) {\n"
      "        gotoxy(x, 1); putchar('#');\n"
      "        gotoxy(x, h); putchar('#');\n"
      "    }\n"
      "    for (y = 1; y <= h; y++) {\n"
      "        gotoxy(1, y); putchar('#');\n"
      "        gotoxy(w, y); putchar('#');\n"
      "    }\n"
      "\n"
      "    gotoxy(w / 2, h / 2);\n"
      "    putchar('@');\n"
      "\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <string.h>\n"
      "\n"
      "int main(void) {\n"
      "    char s[32];\n"
      "    scanf(\"%s\", s);\n"
      "\n"
      "    int cnt[4] = {0};   /* up, left, down, right */\n"
      "    int dir = 0;        /* 默认 UP */\n"
      "    int i;\n"
      "\n"
      "    for (i = 0; s[i]; i++) {\n"
      "        switch (s[i]) {\n"
      "            case 'w': cnt[0]++; dir = 0; break;\n"
      "            case 'a': cnt[1]++; dir = 1; break;\n"
      "            case 's': cnt[2]++; dir = 2; break;\n"
      "            case 'd': cnt[3]++; dir = 3; break;\n"
      "            default: break;\n"
      "        }\n"
      "    }\n"
      "\n"
      "    printf(\"w:%d\\n\", cnt[0]);\n"
      "    printf(\"a:%d\\n\", cnt[1]);\n"
      "    printf(\"s:%d\\n\", cnt[2]);\n"
      "    printf(\"d:%d\\n\", cnt[3]);\n"
      "\n"
      "    const char *names[4] = {\"UP\", \"LEFT\", \"DOWN\", \"RIGHT\"};\n"
      "    printf(\"最终方向:%s\\n\", names[dir]);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "\n"
      "int main(void) {\n"
      "    int m;\n"
      "    scanf(\"%d\", &m);\n"
      "\n"
      "    for (int i = 0; i < m; i++) {\n"
      "        int len;\n"
      "        int vals[10];\n"
      "\n"
      "        scanf(\"%d\", &len);\n"
      "        for (int j = 0; j < len; j++)\n"
      "            scanf(\"%d\", &vals[j]);\n"
      "\n"
      "        int code = -1;\n"
      "\n"
      "        if (len >= 2 && (vals[0] == 224 || vals[0] == 0)) {\n"
      "            code = vals[1];\n"
      "        } else if (len >= 1) {\n"
      "            code = vals[0];\n"
      "        }\n"
      "\n"
      "        switch (code) {\n"
      "            case 72: printf(\"UP\\n\"); break;\n"
      "            case 80: printf(\"DOWN\\n\"); break;\n"
      "            case 75: printf(\"LEFT\\n\"); break;\n"
      "            case 77: printf(\"RIGHT\\n\"); break;\n"
      "            default: printf(\"UNKNOWN\\n\"); break;\n"
      "        }\n"
      "    }\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <stdlib.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int *a = (int *)malloc(n * sizeof(int));\n"
      "    if (a == NULL) {\n"
      "        printf(\"0\\n\");\n"
      "        return 0;\n"
      "    }\n"
      "\n"
      "    int sum = 0;\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        scanf(\"%d\", &a[i]);\n"
      "        sum += a[i];\n"
      "    }\n"
      "\n"
      "    printf(\"%d\\n\", sum);\n"
      "\n"
      "    free(a);\n"
      "    return 0;\n"
      "}",
    "#include <stdio.h>\n"
      "#include <stdlib.h>\n"
      "\n"
      "int main(void) {\n"
      "    int n;\n"
      "    scanf(\"%d\", &n);\n"
      "\n"
      "    int cap = 4;\n"
      "    int cnt = 0;\n"
      "    int *a = (int *)malloc(cap * sizeof(int));\n"
      "\n"
      "    for (int i = 0; i < n; i++) {\n"
      "        int v;\n"
      "        scanf(\"%d\", &v);\n"
      "\n"
      "        if (cnt == cap) {\n"
      "            cap *= 2;\n"
      "            a = (int *)realloc(a, cap * sizeof(int));\n"
      "        }\n"
      "\n"
      "        a[cnt++] = v;\n"
      "    }\n"
      "\n"
      "    for (int i = 0; i < cnt; i++) {\n"
      "        if (i > 0) printf(\" \");\n"
      "        printf(\"%d\", a[i]);\n"
      "    }\n"
      "    printf(\"\\n\");\n"
      "\n"
      "    free(a);\n"
      "    return 0;\n"
      "}"
};

/* 提示 */
static const char *HANDS_HINTS[40][3] = {
    { "交换不能直接写 a = b; b = a;，那样 a 的原始值会丢掉。", "需要一个临时变量 t 先存住 a 的值。", "三行：t = a;  a = b;  b = t;" },
    { "直接把 c * 9 / 5 写成整数运算会丢小数。", "把 9 或 5 至少一个写成 9.0 / 5.0，除法才会走浮点。", "f = c * 9.0 / 5.0 + 32;" },
    { "规则有两半，中间是「或者」。", "能被 4 整除写 y % 4 == 0。", "leap = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);" },
    { "既然不能存副本，那就把两个数的信息「叠加」进一个数里。", "先把和存进 a：a = a + b;  此时 a 里同时含有原来的 a 和 b。", "b = a - b;  再把 a 的旧值还回去：a = a - b;" },
    { "按分数从高到低判断，先问「是不是 >= 90」。", "else if 链条里，走到第二个分支说明已经不到 90 了，所以只要写 s >= 60。", "if (s >= 90) ... else if (s >= 60) ... else ..." },
    { "读一个字符用 %c，注意前面要有空格跳过空白：scanf(\"%d %c %d\", ...)。", "每种运算一个 case，记得写 break。", "除法要先判 b == 0，算的时候写 (double)a / b 才不会丢小数。" },
    { "需要两个东西：一个累加器 sum，一个计数器 i。", "for (int i = 1; i <= n; i++) sum += i;", "注意条件是 i <= n，写成 i < n 会少加一个 n。" },
    { "循环 9 次，每次打印一项 \"n*i=积\"。", "麻烦在空格：第一项前面不能有空格，最后一项后面不能有空格。", "常见写法：if (i > 1) printf(\" \"); 然后再打印这一项。" },
    { "取最后一位：n % 10。去掉最后一位：n /= 10。", "每取一位，把 rev 乘 10 再加进去：rev = rev * 10 + n % 10;", "这里用 do-while 更自然：n = 0 的时候也要输出一次 0，用 while 会一次都不进循环。" },
    { "先把第一个元素当成当前的最大值、最小值。", "从第二个元素开始遍历，遇到更大的就更新 mx，更小的就更新 mn。", "注意别把 mx 初始化成 0——如果全是负数，0 就不是元素里的值了。" },
    { "用两个下标：一个从头走，一个从尾走，走到中间为止。", "交换 a[i] 和 a[n-1-i]，i 从 0 走到 n/2 之前。", "为什么是 n/2？走一半就够了，多走会把刚换好的又换回去。" },
    { "计数数组是这类题的万能套路：cnt[10]，下标就是被统计的数字。", "读到 x 就让 cnt[x]++ —— 用值当下标，这是数组最有用的一招。", "别忘了 int cnt[10] = {0}; 先清零，否则是垃圾值。" },
    { "绝对值就是「负数变正，其他不变」。", "判断 x < 0 时返回 -x。", "别写成 x = -x; 然后 return x;——也能对，但直接 return -x; 更清楚。" },
    { "递归必须先写「出口」：n 是 0 或 1 的时候直接返回 n。", "没有出口会无限递归，栈爆了程序就崩。", "出口之后，return fib(n-1) + fib(n-2);" },
    { "参数是指针，所以要操作的是 *pa、*pb，不是 pa、pb。", "直接写 pa = pb; 只是改指针本身，外面的变量一点没变。", "int t = *pa;  *pa = *pb;  *pb = t;" },
    { "指针 p 指向当前元素，*p 就是那个元素。", "改值写 *p = *p + 1; 或者 (*p)++; 注意括号不能少。", "循环 n 次，每次处理完 p++ 指向下一个。" },
    { "用循环从下标 0 往后走，直到遇到 \\0 为止，走一步计数加一。", "fgets 会把行尾的换行符也读进数组，所以数到 \\n 也得停。", "while (s[len] != '\\0' && s[len] != '\\n') len++;" },
    { "和数组逆置一模一样，只不过元素类型是 char。", "交换 s[i] 和 s[len-1-i]，i 走到 len/2 之前。", "别忘了先处理掉末尾的换行符，否则它会被换到字符串最前面。" },
    { "结构体里放一个 char 数组存名字、一个 int 存分数。", "读字符串用 %s 不用取地址；读 int 要写 &s[i].score。", "先假设第 0 个最高，从第 1 个开始比，遇到更高的就记下下标。" },
    { "写用 fopen(name, \"w\") + fprintf + fclose；读用 fopen(name, \"r\") + fscanf + fclose。", "fscanf 读 int 要传地址：fscanf(fp, \"%d\", &v)。", "写完一定要 fclose，否则数据可能还在缓冲区，读的时候读不到。" },
    { "递归的出口是 exp == 0，任何数的 0 次方都是 1。", "偶数次方可以折半：base^10 = (base^5)^2，这样规模立刻减半。", "奇数次方先拆一个出来变成偶数：base^5 = base * base^4。别写成 exp-1 后还调原来的写法，会退化成线性。" },
    { "递归的思路是\"先把上面 n-1 个挪开，处理最底下那个，再把 n-1 个挪回来\"。", "注意参数顺序会换：第一步调用时 via 和 to 交换了位置。", "三步：hanoi(n-1, from, to, via);  打印 from->to;  hanoi(n-1, via, from, to);" },
    { "回溯的骨架：选一个 -> 递归 -> 撤销选择。撤销那步最容易被忘掉。", "用 used[] 数组标记\"这个数这轮用过了\"。", "字典序不是靠回溯天然保证的——必须先把原数组排序。" },
    { "冒泡的内层只要走到 n-1-i，因为末尾 i 个已经排好了。", "交换次数每做一次真正的 swap 就加一，不是每次比较都加。", "已经有序的输入交换次数是 0，这个用例很容易暴露出写错的地方。" },
    { "i 记录\"小于等于基准的区域\"的右边界，一开始是 lo-1。", "循环走完，把基准换到 i+1 的位置，那个位置就是它的最终位置。", "注意条件是 a[j] <= pivot，写 < 在重复元素多的时候会出问题。" },
    { "循环条件是 lo <= hi，不是 lo < hi —— 差一就会漏掉只剩一个元素的情况。", "mid 用 lo + (hi - lo) / 2 比 (lo + hi) / 2 更安全（不会溢出，虽然这题数据小）。", "根据 a[mid] 和 target 的大小关系，缩掉一半：小了就往右找（lo = mid+1），大了往左找（hi = mid-1）。" },
    { "二分答案的关键：这个问题的答案有单调性——如果 m 满足 m*m<=x，那么比 m 小的都满足。", "所以可以二分\"最大满足条件的 m\"：满足就往右试（lo = mid+1），不满足往左退。", "mid * mid 在 x 接近 2e9 时会超过 int 上限（约 2.1e9），必须用 long long。" },
    { "走到第 n 级，最后一步要么是从 n-1 迈 1 级，要么是从 n-2 迈 2 级。", "所以总数 = f(n-1) + f(n-2)，这正是斐波那契的递推式。", "n=1 和 n=2 是边界，必须单独处理，否则循环里会算错。40 级的结果超过 int 吗？想想 165580141。" },
    { "cur 表示\"以 i 结尾\"的最大和。如果 cur + a[i] 比 a[i] 还小，说明前面那段不如不要。", "cur 和 best 都要初始化成 a[0]，不是 0 —— 全负数的用例会立刻暴露这个问题。", "每次更新完 cur 就拿去和 best 比一下。" },
    { "dp[w] 表示\"容量为 w 时能装的最大价值\"。", "关键在倒序：如果正序（w 从 wt[i] 到 W），同一件物品可能被重复塞进去好几次。", "拿它和不拿它取最大：dp[w] = max(dp[w], dp[w-wt] + val)。" },
    { "数组有序是关键 —— 有序才能用双指针。", "当前和比 target 小，说明左边的数太小了，l 往右移；比 target 大就把 r 往左移。", "循环条件是 l < r，不能是 l <= r（那样同一个数会被用两次）。" },
    { "n - 1 会把最低位的 1 变成 0，把它的低位全变成 1；再和 n 做 &= 正好抹掉那个 1。", "所以要循环，每轮消掉一个 1，循环几次就有几个 1。", "用 unsigned int 避免符号位的坑，读入用 %u。" },
    { "srand(seed) 只调用一次，放在循环外面。", "如果放进循环里，每次都会重置序列，输出会全是同一个数。", "rand() % 100 把结果压到 0~99。" },
    { "用 do-while：先生成，再检查，占了就重来。", "用 used[][] 二维数组标记哪些格子被占了。", "这是贪吃蛇放食物、扫雷埋雷的核心写法。" },
    { "\\033 是 ESC 字符的八进制写法，后面跟 [31m 表示红色。", "上色之后一定要用 \\033[0m 恢复，否则后面的输出也会被染色。", "每行别忘了 \\n。" },
    { "先画上下两条横线，再画左右两条竖线，四角会重叠但没关系（都是 #）。", "中心坐标是 (w/2, h/2)。", "注意 ANSI 的参数顺序是\"行;列\"，而通常我们说坐标是\"x,y\"（列,行），写反了会跑到奇怪的地方。" },
    { "用 case 把字符映射成方向下标，count 数组顺手就统计了。", "每次 switch 命中都覆盖 dir，自然就是\"最后一次\"。", "names[] 字符串数组把数字变成可读名字，比四个 if 清爽。" },
    { "先判断长度够不够——只有一个数的时候没有第二个键码可读。", "如果第一个是 224 或 0，说明这是方向键，真正的键码是第二个数。", "这是 kbhit + _getch 读方向键的标准写法：if (key == 0 || key == 224) key = _getch();" },
    { "malloc(n * sizeof(int)) 申请 n 个 int 的空间，返回值要判 NULL。", "用起来和普通数组一样：a[i]。", "用完必须 free(a)，否则就是内存泄漏。" },
    { "条件就是\"满了\"：cnt == cap 时扩容。", "realloc 的返回值要重新赋给 a（地址可能变了）。", "翻倍扩容是均摊 O(1) 的关键，每次只加 1 会变成 O(n²)。" }
};

/* ---------- 章节表 ---------- */
static const Chapter CHAPTERS[] = {
    { "变量与类型", "int / float / char 与格式化输出", ch1_qs,
      (int)(sizeof(ch1_qs) / sizeof(ch1_qs[0])) },
    { "运算符与表达式", "优先级、自增、取模、位运算", ch2_qs,
      (int)(sizeof(ch2_qs) / sizeof(ch2_qs[0])) },
    { "分支结构", "if / else / switch 与常见陷阱", ch3_qs,
      (int)(sizeof(ch3_qs) / sizeof(ch3_qs[0])) },
    { "循环", "for / while / do-while 与边界", ch4_qs,
      (int)(sizeof(ch4_qs) / sizeof(ch4_qs[0])) },
    { "数组", "下标、初始化、sizeof、越界", ch5_qs,
      (int)(sizeof(ch5_qs) / sizeof(ch5_qs[0])) },
    { "函数", "参数传递、返回值、递归、作用域", ch6_qs,
      (int)(sizeof(ch6_qs) / sizeof(ch6_qs[0])) },
    { "指针", "取地址、解引用、指针改值、指针与数组", ch7_qs,
      (int)(sizeof(ch7_qs) / sizeof(ch7_qs[0])) },
    { "字符与字符串", "数组 vs 字符串、strlen、结尾的 \\0", ch8_qs,
      (int)(sizeof(ch8_qs) / sizeof(ch8_qs[0])) },
    { "结构体与 typedef", "定义、访问、指针访问、结构体内存", ch9_qs,
      (int)(sizeof(ch9_qs) / sizeof(ch9_qs[0])) },
    { "文件操作", "fopen / fprintf / fscanf / fclose", ch10_qs,
      (int)(sizeof(ch10_qs) / sizeof(ch10_qs[0])) }
};

#define CHAPTER_COUNT ((int)(sizeof(CHAPTERS) / sizeof(CHAPTERS[0])))

/* =============================================================
 *  小工具
 * ============================================================= */

static void clear_screen(void) {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
}

static void wait_enter(void) {
    int c;
    printf("\n按回车继续...");
    fflush(stdout);
    while ((c = getchar()) != '\n' && c != EOF) { }
    /* 注意：EOF 也要退出，否则输入流结束后程序会在这里空转 */
}

/* 读一行，去掉换行符。返回 0 表示遇到 EOF（输入流结束）。 */
static int read_line(char *buf, int size) {
    if (fgets(buf, size, stdin) == NULL) {
        buf[0] = '\0';
        return 0;
    }
    size_t len = strlen(buf);
    while (len > 0 && (buf[len - 1] == '\n' || buf[len - 1] == '\r')) {
        buf[--len] = '\0';
    }
    return 1;
}

/* 打印带行号的代码 */
static void print_code(const char *code, int highlight) {
    char line[512];
    int  no = 1;
    const char *p = code;

    printf("  +------------------------------------------------+\n");
    while (*p) {
        int n = 0;
        while (*p && *p != '\n' && n < (int)sizeof(line) - 1) {
            line[n++] = *p++;
        }
        line[n] = '\0';
        if (*p == '\n') p++;

        if (highlight > 0 && no == highlight) {
            printf("  | %2d > %-42s |\n", no, line);
        } else {
            printf("  | %2d | %-42s |\n", no, line);
        }
        no++;
    }
    printf("  +------------------------------------------------+\n");
}

/* 画一条分隔线 */
static void hr(char c, int n) {
    for (int i = 0; i < n; i++) putchar(c);
    putchar('\n');
}

/* UTF-8 下一个汉字通常占 3 字节，但显示宽度是 2。
   这个函数数"显示宽度"，用来做中英混排对齐。 */
static int visual_width(const char *s) {
    int w = 0;
    while (*s) {
        unsigned char c = (unsigned char)*s;
        if (c < 0x80)       { w += 1; s += 1; }   /* ASCII */
        else if (c < 0xC0)  { s += 1; }           /* 续字节，跳过 */
        else if (c < 0xE0)  { w += 1; s += 2; }   /* 2 字节序列 */
        else if (c < 0xF0)  { w += 2; s += 3; }   /* 3 字节：中日韩 */
        else                { w += 2; s += 4; }   /* 4 字节：emoji */
    }
    return w;
}

/* 补空格到指定显示宽度 */
static void pad_visual(const char *s, int width) {
    int pad = width - visual_width(s);
    while (pad-- > 0) putchar(' ');
}

/* ---------- 找 Bug 题的选项生成 ---------- */
/* 数代码有多少行 */
static int count_lines(const char *code) {
    int n = 1;
    while (*code) {
        if (*code == '\n') n++;
        code++;
    }
    return n;
}

/* 判断某一行是不是空的（只有空白） */
static int line_is_blank(const char *code, int lineNo) {
    int cur = 0;
    const char *p = code;
    while (*p && cur < lineNo) {
        if (*p == '\n') cur++;
        p++;
    }
    while (*p && *p != '\n') {
        if (*p != ' ' && *p != '\t' && *p != '\r') return 0;
        p++;
    }
    return 1;
}

/* 给找 Bug 题生成 4 个行号选项（含正确答案），返回正确答案在选项里的下标。
   规则和网页版一致：从非空行里随机挑，正确答案一定在里面。 */
static int build_line_options(const Question *q, int *out) {
    int total = count_lines(q->code);
    int pool[256];
    int poolN = 0;
    int slot = 0;

    for (int i = 0; i < total && i < 256; i++) {
        if (!line_is_blank(q->code, i)) pool[poolN++] = i;
    }

    /* 正确答案放进去 */
    out[0] = q->answer;
    slot = 1;

    /* 用固定步长错开挑选，保证每次运行结果稳定、答案不在固定位置 */
    if (poolN > 0) {
        int step = (poolN / (OPT_COUNT - 1)) > 0 ? (poolN / (OPT_COUNT - 1)) : 1;
        int start = (q->answer * 7 + total) % poolN;
        for (int k = 0; k < poolN && slot < OPT_COUNT; k++) {
            int cand = pool[(start + k * step) % poolN];
            int dup = 0;
            for (int s = 0; s < slot; s++) if (out[s] == cand) dup = 1;
            if (!dup) out[slot++] = cand;
        }
        /* 不够就顺序补齐 */
        for (int k = 0; k < poolN && slot < OPT_COUNT; k++) {
            int cand = pool[k];
            int dup = 0;
            for (int s = 0; s < slot; s++) if (out[s] == cand) dup = 1;
            if (!dup) out[slot++] = cand;
        }
    }

    /* 把正确答案挪到一个由题号决定的固定位置，模拟"打散" */
    {
        int want = (q->answer + total) % OPT_COUNT;
        if (want < slot && want != 0) {
            int t = out[0]; out[0] = out[want]; out[want] = t;
        }
    }

    /* 返回正确答案现在所在的下标 */
    for (int s = 0; s < OPT_COUNT; s++) if (out[s] == q->answer) return s;
    return 0;
}

/* 星级 -> 星号串 */
static void stars_str(int stars, char *out) {
    int i;
    for (i = 0; i < 3; i++) out[i] = (i < stars) ? '*' : '-';
    out[3] = '\0';
}

/* =============================================================
 *  存档
 * ============================================================= */

static void save_load(Save *s) {
    FILE *fp;
    memset(s, 0, sizeof(*s));
    fp = fopen(SAVE_FILE, "r");
    if (!fp) return;

    for (int i = 0; i < CHAPTER_COUNT; i++) {
        if (fscanf(fp, "%d %d", &s->stars[i], &s->best[i]) != 2) break;
    }
    fclose(fp);
    s->played = 1;
}

static void save_write(const Save *s) {
    FILE *fp = fopen(SAVE_FILE, "w");
    if (!fp) return;
    for (int i = 0; i < CHAPTER_COUNT; i++) {
        fprintf(fp, "%d %d\n", s->stars[i], s->best[i]);
    }
    fclose(fp);
}

/* =============================================================
 *  游戏流程
 * ============================================================= */

/* 返回 1 表示本章通过 */
static int play_chapter(int ci, Save *save) {
    const Chapter *ch = &CHAPTERS[ci];
    int hearts = MAX_HEARTS;
    int score = 0, correct = 0, combo = 0, max_combo = 0;
    int stars = 0;

    for (int qi = 0; qi < ch->count; qi++) {
        const Question *q = &ch->qs[qi];
        char buf[64];
        int  picked = -1;
        int  lineOpts[OPT_COUNT];   /* 找 Bug 题的动态行号选项 */

        clear_screen();
        hr('=', 60);
        printf("  %s   [第 %d/%d 题]\n", ch->name, qi + 1, ch->count);
        hr('=', 60);
        printf("  生命: ");
        for (int h = 0; h < MAX_HEARTS; h++) printf(h < hearts ? "[#]" : "[ ]");
        printf("    得分: %d    连击: %d\n\n", score, combo);

        printf("  %s\n\n", q->question);
        /* 找 Bug 题先不高亮，等答完再高亮那一行（和网页版一致，免得提前泄题） */
        print_code(q->code, 0);
        printf("\n");

        /* 找 Bug 题的选项是"代码行号"，运行时动态生成；其余题直接用题库里的选项 */
        if (q->type == Q_BUG) {
            build_line_options(q, lineOpts);
            for (int i = 0; i < OPT_COUNT; i++) {
                printf("   %d) 第 %d 行\n", i + 1, lineOpts[i] + 1);
            }
        } else {
            for (int i = 0; i < OPT_COUNT; i++) {
                printf("   %d) %s\n", i + 1, q->opts[i]);
            }
        }

        /* 输入循环 */
        while (picked < 0 || picked >= OPT_COUNT) {
            printf("\n  请输入选项 (1-%d): ", OPT_COUNT);
            fflush(stdout);
            if (!read_line(buf, sizeof(buf))) return 0;   /* 输入流结束，当成中途退出 */
            if (buf[0] == 'q' || buf[0] == 'Q') return 0;   /* 中途退出不算通过 */
            picked = atoi(buf) - 1;
            if (picked < 0 || picked >= OPT_COUNT) {
                printf("  无效输入，请重新输入。\n");
            }
        }

        /* 判定 */
        printf("\n");
        {
            /* 找 Bug 题的"正确选项下标"是动态算出来的，其它题就是 q->answer */
            int rightIdx = (q->type == Q_BUG) ? build_line_options(q, lineOpts) : q->answer;

            if (picked == rightIdx) {
                int gain;
                correct++;
                combo++;
                if (combo > max_combo) max_combo = combo;
                gain = 10 + (combo >= 2 ? 5 * (combo - 1) : 0);
                score += gain;
                printf("  [OK] 答对了！ +%d 分", gain);
                if (combo >= 2) printf("  (%d 连击)", combo);
                printf("\n");
            } else {
                combo = 0;
                hearts--;
                if (q->type == Q_BUG) {
                    printf("  [X] 答错了。正确答案是 %d) 第 %d 行\n",
                           rightIdx + 1, lineOpts[rightIdx] + 1);
                } else {
                    printf("  [X] 答错了。正确答案是 %d) %s\n",
                           q->answer + 1, q->opts[q->answer]);
                }
                printf("      生命 -1，剩 %d\n", hearts);
            }

            /* 答完后把正确的那一行高亮出来，方便对照 */
            if (q->type == Q_BUG) {
                printf("\n");
                print_code(q->code, q->answer + 1);
            }
        }

        printf("\n  解析：%s\n", q->why);
        wait_enter();

        if (hearts <= 0) {
            printf("\n  生命耗尽...\n");
            break;
        }
    }

    /* 结算 */
    {
        int pct = ch->count > 0 ? correct * 100 / ch->count : 0;
        int passed = (hearts > 0) && (pct >= PASS_RATE);

        if (passed) {
            if (correct == ch->count) stars = 3;
            else if (pct >= 85) stars = 2;
            else stars = 1;
        }

        clear_screen();
        hr('*', 60);
        printf("  章节结算：%s\n", ch->name);
        hr('*', 60);
        printf("  答对：%d / %d\n", correct, ch->count);
        printf("  得分：%d\n", score);
        printf("  最高连击：%d\n", max_combo);
        printf("  剩余生命：%d\n", hearts > 0 ? hearts : 0);
        {
            char st[4];
            stars_str(stars, st);
            printf("  评价：[%s]\n", st);
        }
        if (passed) {
            printf("\n  本章通过！\n");
        } else {
            printf("\n  未通过，再练一次吧。\n");
        }

        if (stars > save->stars[ci]) save->stars[ci] = stars;
        if (score > save->best[ci]) save->best[ci] = score;
        save->played = 1;
        save_write(save);

        wait_enter();
        return passed;
    }
}

static void show_map(const Save *save) {
    clear_screen();
    hr('=', 60);
    printf("   C QUEST  -  C 语言闯关\n");
    hr('=', 60);

    for (int i = 0; i < CHAPTER_COUNT; i++) {
        char st[4];
        int unlocked = (i == 0) || (save->stars[i - 1] >= 1);
        stars_str(save->stars[i], st);
        printf("  %2d. %s", i + 1, CHAPTERS[i].name);
        /* 中文占两个显示宽度，%-16s 是按字节补的会错位，所以手工按显示宽度补齐 */
        pad_visual(CHAPTERS[i].name, 18);
        printf("[%s]  %s\n", st, unlocked ? "" : "(未解锁)");
        printf("      %s\n", CHAPTERS[i].desc);
    }
    hr('-', 60);
    printf("   章节号=闯关  p=实操写代码  s=成绩  h=玩法  q=退出: ");
}

/* =============================================================
 *  实操模式（终端版）
 *
 *  流程：显示任务 → 生成 practice.c 模板 → 你写好代码按回车
 *        → 游戏调 TCC 编译 → 跑全部测试用例 → 逐条比对给结果
 *
 *  这里刻意用了 fork/exec 一类的做法：通过 system() 调 tcc.exe。
 *  好处是不依赖任何第三方库，坏处是 tcc 的路径必须相对本程序。
 * ============================================================= */

#define PRACTICE_SRC   "practice.c"
#define PRACTICE_EXE   "practice.exe"
#define PRACTICE_OUT   "practice_out.txt"
#define PRACTICE_DIR   "practice_%s"

/* 判断某个文件存不存在 */
static int file_exists(const char *p) {
    FILE *f = fopen(p, "r");
    if (!f) return 0;
    fclose(f);
    return 1;
}

/* 把一段文本写进文件 */
static int write_file(const char *p, const char *text) {
    FILE *f = fopen(p, "w");
    if (!f) return 0;
    fputs(text, f);
    fclose(f);
    return 1;
}

/* 读整个文件到 buf（最多 size-1 字节） */
static int read_file(const char *p, char *buf, int size) {
    FILE *f = fopen(p, "r");
    int n;
    if (!f) return 0;
    n = (int)fread(buf, 1, size - 1, f);
    buf[n > 0 ? n : 0] = '\0';
    fclose(f);
    return n;
}

/* 去掉字符串尾部的空白（比较输出时用） */
static void rtrim(char *s) {
    int n = (int)strlen(s);
    while (n > 0 && (s[n - 1] == '\n' || s[n - 1] == '\r' || s[n - 1] == ' ' || s[n - 1] == '\t')) {
        s[--n] = '\0';
    }
}

/* 把 Windows 的 CRLF 换成 LF，方便和期望输出比对 */
static void to_lf(char *s) {
    char *r = s, *w = s;
    while (*r) {
        if (*r == '\r' && *(r + 1) == '\n') { r++; continue; }
        *w++ = *r++;
    }
    *w = '\0';
}

/* 把空格/换行显示成看得见的符号，方便发现"多一个空格" */
static void show_invisible(const char *s, char *out, int outSize) {
    int i = 0;
    while (*s && i < outSize - 12) {
        if (*s == ' ') {
            out[i++] = '<'; out[i++] = '_'; out[i++] = '>';
        } else if (*s == '\n') {
            out[i++] = '<'; out[i++] = 'E'; out[i++] = '>';
        } else if (*s == '\t') {
            out[i++] = '<'; out[i++] = 'T'; out[i++] = '>';
        } else {
            out[i++] = *s;
        }
        s++;
    }
    out[i] = '\0';
}

/* ---------------- 列表 ---------------- */
static void show_hands_list(void) {
    clear_screen();
    hr('=', 60);
    printf("   实操题：动手写代码\n");
    hr('=', 60);
    printf("   规则：每题给你一个代码模板，你把它写完，游戏负责编译和判分。\n");
    printf("   提示：<_> 表示一个空格，<E> 表示换行（比对输出时很有用）\n\n");

    for (int i = 0; i < HANDS_COUNT; i++) {
        char level[8];
        char chPad[64];
        int k;
        for (k = 0; k < HANDS[i].level && k < 7; k++) level[k] = '*';
        level[k] = '\0';

        printf("  %2d. ", i + 1);
        printf("%s", HANDS[i].title);
        strncpy(chPad, HANDS[i].ch, sizeof(chPad) - 1);
        chPad[sizeof(chPad) - 1] = '\0';
        printf("  [%s]  %s\n", level, chPad);
    }
    hr('-', 60);
    printf("   输入题号开始（q 返回主菜单）： ");
}

/* ---------------- 单题 ---------------- */
static void practice_one(int idx) {
    const HandMeta *m = &HANDS[idx];
    const char *starter = HANDS_STARTER[idx];
    const char *sol = HANDS_SOLUTION[idx];
    int nCases = HANDS_CASE_N[idx];
    char buf[64];

    clear_screen();
    hr('=', 60);
    printf("   %s\n", m->title);
    printf("   %s · 难度 %d\n", m->ch, m->level);
    hr('=', 60);

    printf("\n【任务】\n");
    printf("  %s\n", m->task);

    if (m->detail && m->detail[0]) {
        printf("\n【输入 / 输出要求】\n");
        /* detail 里本来就带换行，逐行缩进打印 */
        {
            const char *p = m->detail;
            while (*p) {
                const char *e = strchr(p, '\n');
                int len = e ? (int)(e - p) : (int)strlen(p);
                printf("  %.*s\n", len, p);
                p = e ? e + 1 : p + len;
                if (!*p) break;
            }
        }
    }

    printf("\n【测试用例】\n");
    for (int i = 0; i < nCases; i++) {
        char vis[256];
        show_invisible(HANDS_CASES[idx][i].in, vis, sizeof(vis));
        printf("  用例 %d  输入: %s\n", i + 1, vis);
    }

    /* 写出模板（如果已有你自己的代码，问一下要不要覆盖） */
    printf("\n");
    if (file_exists(PRACTICE_SRC)) {
        printf("  检测到已有的 %s。\n", PRACTICE_SRC);
        printf("  覆盖成官方模板？(y=覆盖 / 其他=保留你的代码): ");
        fflush(stdout);
        if (!read_line(buf, sizeof(buf))) return;
        if (buf[0] == 'y' || buf[0] == 'Y') {
            write_file(PRACTICE_SRC, starter);
            printf("  已写入模板。\n");
        } else {
            printf("  保留你现有的代码。\n");
        }
    } else {
        write_file(PRACTICE_SRC, starter);
        printf("  已生成模板文件: %s\n", PRACTICE_SRC);
    }

    printf("\n  接下来：\n");
    printf("    1. 用任意编辑器打开 %s，把代码补完\n", PRACTICE_SRC);
    printf("    2. 保存后回到这里，按回车，我来编译和判分\n");
    printf("\n  也可以输入 s 看提示，a 看参考答案，q 返回。\n");
    printf("\n  准备好了就按回车: ");
    fflush(stdout);
    if (!read_line(buf, sizeof(buf))) return;

    if (buf[0] == 'q' || buf[0] == 'Q') return;

    if (buf[0] == 's' || buf[0] == 'S') {
        printf("\n【提示】\n");
        for (int i = 0; i < 3; i++) {
            if (HANDS_HINTS[idx][i] && HANDS_HINTS[idx][i][0]) {
                printf("  %d) %s\n", i + 1, HANDS_HINTS[idx][i]);
            }
        }
        printf("\n按回车继续: ");
        fflush(stdout);
        read_line(buf, sizeof(buf));
    }

    if (buf[0] == 'a' || buf[0] == 'A') {
        printf("\n【参考答案】\n");
        printf("%s\n", sol);
        printf("\n要把参考解答写进 %s 吗？(y/n): ", PRACTICE_SRC);
        fflush(stdout);
        read_line(buf, sizeof(buf));
        if (buf[0] == 'y' || buf[0] == 'Y') {
            write_file(PRACTICE_SRC, sol);
            printf("已写入。\n");
        }
        return;
    }

    if (buf[0] == 'q' || buf[0] == 'Q') return;

    /* ---------- 编译 ---------- */
    clear_screen();
    hr('=', 60);
    printf("   正在编译 %s ...\n", PRACTICE_SRC);
    hr('=', 60);

    {
        char cmd[512];
#ifdef _WIN32
        sprintf(cmd, "tools\\tcc\\tcc.exe -o %s %s > %s 2>&1",
                PRACTICE_EXE, PRACTICE_SRC, PRACTICE_OUT);
#else
        sprintf(cmd, "tools/tcc/tcc.exe -o %s %s > %s 2>&1",
                PRACTICE_EXE, PRACTICE_SRC, PRACTICE_OUT);
#endif
        if (system(cmd) != 0) {
            char err[4096];
            read_file(PRACTICE_OUT, err, sizeof(err));
            printf("\n  编译没通过：\n\n");
            printf("%s\n", err[0] ? err : "(没有错误信息)");
            printf("\n  改完 %s 再回来试一次。\n", PRACTICE_SRC);
            remove(PRACTICE_OUT);
            wait_enter();
            return;
        }
    }
    remove(PRACTICE_OUT);
    printf("  编译通过。\n");

    /* ---------- 逐个跑用例 ---------- */
    printf("\n   正在跑测试用例 ...\n\n");
    int passed = 0;

    for (int i = 0; i < nCases; i++) {
        char cmd[512];
        char got[8192] = {0};
        char want[2048];
        char inVis[256];

        /* 把这一题的输入写进临时文件，重定向给程序 */
        write_file("practice_in.txt", HANDS_CASES[idx][i].in);

#ifdef _WIN32
        sprintf(cmd, "%s < practice_in.txt > %s 2>&1", PRACTICE_EXE, PRACTICE_OUT);
#else
        sprintf(cmd, "./%s < practice_in.txt > %s 2>&1", PRACTICE_EXE, PRACTICE_OUT);
#endif
        system(cmd);

        read_file(PRACTICE_OUT, got, sizeof(got));
        strncpy(want, HANDS_CASES[idx][i].expect, sizeof(want) - 1);
        want[sizeof(want) - 1] = '\0';

        /* 只把 CRLF 归一成 LF，保留末尾换行。
           题目里明确要求了"行尾换行"，少一个换行就是错，这里不能宽容。 */
        to_lf(got);
        to_lf(want);

        show_invisible(HANDS_CASES[idx][i].in, inVis, sizeof(inVis));

        if (strcmp(got, want) == 0) {
            printf("  [OK] 用例 %d   输入: %s\n", i + 1, inVis);
            passed++;
        } else {
            char gv[1024], wv[1024];
            show_invisible(want, wv, sizeof(wv));
            show_invisible(got, gv, sizeof(gv));
            printf("  [X]  用例 %d   输入: %s\n", i + 1, inVis);
            printf("         期望: %s\n", wv);
            printf("         实际: %s\n", gv);
        }
    }

    remove(PRACTICE_OUT);
    remove("practice_in.txt");

    printf("\n");
    hr('-', 60);
    if (passed == nCases) {
        printf("  全部 %d 个用例通过！这道题拿下了。\n", nCases);
    } else {
        printf("  通过 %d / %d 个用例。\n", passed, nCases);
        printf("  注意上面的 <_> 和 <E> ：分别代表空格和换行。\n");
    }
    hr('-', 60);
    wait_enter();
}

/* ---------------- 入口 ---------------- */
static void practice_menu(void) {
    while (1) {
        char buf[64];
        int n;

        show_hands_list();
        if (!read_line(buf, sizeof(buf))) return;
        if (buf[0] == 'q' || buf[0] == 'Q') return;

        n = atoi(buf);
        if (n < 1 || n > HANDS_COUNT) {
            printf("\n  没有这道题，按回车重来。\n");
            wait_enter();
            continue;
        }
        practice_one(n - 1);
    }
}

static void show_help(void) {
    clear_screen();
    hr('=', 60);
    printf("   怎么玩\n");
    hr('=', 60);
    printf(
        "  * 每章有若干道题，题型有三种：\n"
        "      预测输出  —— 读代码，猜它打印什么\n"
        "      概念选择  —— 选出正确说法\n"
        "      找出错行  —— 代码有 bug，指出第几行\n\n"
        "  * 你有 3 条命，答错扣 1 条，扣光就得重来。\n"
        "  * 答对加分，连击有额外奖励（连击越高加得越多）。\n"
        "  * 答对 60%% 以上算通过，全对得 3 星。\n"
        "  * 通关一章才会解锁下一章。\n"
        "  * 打 'q' 可以中途退出，进度按当前答对率结算。\n\n"
        "  存档放在 %s，删掉它就从头开始。\n"
        "  想改题目？直接改本文件的 QUESTION 数组，重新编译即可。\n",
        SAVE_FILE);
    hr('=', 60);
    wait_enter();
}

static void show_stats(const Save *save) {
    int total_stars = 0, cleared = 0;
    clear_screen();
    hr('=', 60);
    printf("   成绩单\n");
    hr('=', 60);

    for (int i = 0; i < CHAPTER_COUNT; i++) {
        char st[4];
        stars_str(save->stars[i], st);
        total_stars += save->stars[i];
        if (save->stars[i] >= 1) cleared++;
        printf("  %2d. %s", i + 1, CHAPTERS[i].name);
        pad_visual(CHAPTERS[i].name, 18);
        printf("[%s]  最高分 %d\n", st, save->best[i]);
    }
    hr('-', 60);
    printf("   已通关 %d / %d 章，共 %d / %d 星\n",
           cleared, CHAPTER_COUNT, total_stars, CHAPTER_COUNT * 3);
    hr('=', 60);
    wait_enter();
}

/* =============================================================
 *  入口
 * ============================================================= */

int main(void) {
    Save save;

#ifdef _WIN32
    SetConsoleOutputCP(65001);   /* 让 Windows 控制台正确显示中文 */
#endif

    save_load(&save);

    while (1) {
        char buf[64];
        int  n;

        show_map(&save);
        if (!read_line(buf, sizeof(buf))) {     /* 输入流结束就当退出 */
            printf("\n  下次见。\n");
            break;
        }

        if (buf[0] == 'q' || buf[0] == 'Q') {
            printf("\n  下次见。\n");
            break;
        }
        if (buf[0] == 'h' || buf[0] == 'H') {
            show_help();
            continue;
        }
        if (buf[0] == 's' || buf[0] == 'S') {
            show_stats(&save);
            continue;
        }
        if (buf[0] == 'p' || buf[0] == 'P') {
            practice_menu();
            continue;
        }

        n = atoi(buf);
        if (n < 1 || n > CHAPTER_COUNT) {
            printf("\n  没有这一章，按回车重来。\n");
            wait_enter();
            continue;
        }
        n--;

        /* 解锁检查 */
        if (n > 0 && save.stars[n - 1] < 1) {
            printf("\n  先通过「%s」才能解锁这一章。\n", CHAPTERS[n - 1].name);
            wait_enter();
            continue;
        }

        play_chapter(n, &save);
    }

    return 0;
}
