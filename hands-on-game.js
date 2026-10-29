/* ===========================================================
   游戏开发桥接题（Game Bridge）

   这些题不是凭空想的：每道题对应 GitHub 上 C-Language-Games 里
   真实用到的技能，统计如下（9 个游戏）：

     system("cls")  清屏        5 个用了
     rand/srand     随机         5 个
     getch/_getch   读键         4 个
     gotoxy         光标定位      3 个
     Sleep          控制节奏      3 个
     二维数组                     4 个
     struct                       3 个
     kbhit          非阻塞        2 个
     malloc/free    动态内存      2 个

   为了能自动判分，这些题都用"给定种子 → 输出必须确定"的形式，
   不涉及真实交互（交互部分放在最后的游戏大作业里）。
   =========================================================== */
(function (root) {
  const R = String.raw;
  const HQ = root.HQ || (root.HQ = []);

  HQ.push(

    /* ───────── 随机数 ───────── */
    {
      id: 'g1',
      ch: '游戏·随机数',
      title: '用固定种子保证随机可重现',
      level: 3,
      task: '读入种子 seed，用 srand(seed) 生成随机序列，验证「同样的种子跑两次结果一样」。',
      detail:
        '输入：一个整数 seed。' + "\\n" +
        '输出：三行。' + "\\n" +
        '  第 1 行：第一次生成的 5 个数（空格分隔）' + "\\n" +
        '  第 2 行：重新 srand(seed) 后再生成的 5 个数' + "\\n" +
        '  第 3 行：两行是否相同，相同 SAME，不同 DIFF' + "\\n" +
        '说明：不检查具体随机值（各编译器实现不同），' +
        '只检查你是否理解 srand —— 同样的种子必须得到同样的序列。',
      starter: R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int seed;
    int a[5], b[5];
    scanf("%d", &seed);

    /* TODO: 用 srand(seed) 生成 5 个数存进 a[] */

    /* TODO: 重新 srand(seed)，再生成 5 个数存进 b[] */

    /* 依次输出两行，再比较是否完全相同 */

    return 0;
}`,
      solution: R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int seed;
    int a[5], b[5];
    scanf("%d", &seed);

    srand(seed);
    for (int i = 0; i < 5; i++) a[i] = rand() % 100;

    srand(seed);
    for (int i = 0; i < 5; i++) b[i] = rand() % 100;

    for (int i = 0; i < 5; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");

    for (int i = 0; i < 5; i++) {
        if (i > 0) printf(" ");
        printf("%d", b[i]);
    }
    printf("\n");

    int same = 1;
    for (int i = 0; i < 5; i++)
        if (a[i] != b[i]) same = 0;

    printf("%s\n", same ? "SAME" : "DIFF");
    return 0;
}`,
      cases: [
        { in: '1\n', expect: '0 66 95 55 88\n0 66 95 55 88\nSAME\n' },
        { in: '42\n', expect: '60 39 38 40 48\n60 39 38 40 48\nSAME\n' },
        { in: '999\n', expect: '4 75 85 37 11\n4 75 85 37 11\nSAME\n' },
      ],
      hints: [
        'srand(seed) 只调用一次，放在生成这批数的循环外面。',
        '生成完 a[] 后，再调用一次 srand(seed)，序列就从头开始了。',
        '比较两行是否相同，输出 SAME 或 DIFF。'
      ]
    },

    {
      id: 'g2',
      ch: '游戏·随机数',
      title: '随机找一个空格子并验证',
      level: 4,
      task: '棋盘上有些格子被占了，随机挑两个空格；代码要保证它们确实没被占用。',
      detail:
        '输入：第一行 rows cols k；接下来 k 行是 "r c"，表示被占的格子。' + "\\n" +
        '输出：三行。' + "\\n" +
        '  第 1 行：第一个空格坐标 "r c"' + "\\n" +
        '  第 2 行：第二个空格坐标 "r c"' + "\\n" +
        '  第 3 行：两者是否都不是被占格，输出 OK 或 BAD' + "\\n" +
        '说明：不检查具体坐标，只检查循环有没有正确跳过已占格。',
      starter: R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int rows, cols, k;
    int used[50][50] = {0};
    scanf("%d %d %d", &rows, &cols, &k);

    for (int i = 0; i < k; i++) {
        int r, c;
        scanf("%d %d", &r, &c);
        used[r][c] = 1;
    }

    srand(12345);

    /* TODO: 找一个空格，记到 r1 c1 */

    /* TODO: 再找一个空格，记到 r2 c2 */

    /* TODO: 输出两行坐标，再验证并输出 OK / BAD */

    return 0;
}`,
      solution: R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int rows, cols, k;
    int used[50][50] = {0};
    scanf("%d %d %d", &rows, &cols, &k);

    for (int i = 0; i < k; i++) {
        int r, c;
        scanf("%d %d", &r, &c);
        used[r][c] = 1;
    }

    srand(12345);

    int r1 = 0, c1 = 0;
    do {
        r1 = rand() % rows;
        c1 = rand() % cols;
    } while (used[r1][c1]);

    int r2 = 0, c2 = 0;
    do {
        r2 = rand() % rows;
        c2 = rand() % cols;
    } while (used[r2][c2]);

    printf("%d %d\n", r1, c1);
    printf("%d %d\n", r2, c2);

    if (!used[r1][c1] && !used[r2][c2])
        printf("OK\n");
    else
        printf("BAD\n");

    return 0;
}`,
      cases: [
        { in: '5 5 3\n0 0\n1 1\n2 2\n', expect: '3 1\n1 2\nOK\n' },
        { in: '3 3 8\n0 0\n0 1\n0 2\n1 0\n1 1\n1 2\n2 0\n2 1\n', expect: '2 2\n2 2\nOK\n' }
      ],
      hints: [
        '用 do-while：先生成，再检查，被占就重来。',
        '两个坐标都用同一个 srand(12345)，保证可重复。',
        '最后用 used[] 再验证一遍，输出 OK 或 BAD。'
      ]
    },

    /* ───────── 控制台控制 ───────── */
    {
      id: 'g3',
      ch: '游戏·控制台',
      title: '颜色名到转义码的映射',
      level: 2,
      task: '终端用 ESC[3Xm 控制颜色。这里不输出 ESC 字节，只考颜色名到码值的映射。',
      detail:
        '输入：若干颜色名，空格分隔。' + "\\n" +
        '输出：每个名字一行，格式 "名字=码值"。' + "\\n" +
        '  映射：RED=31 GREEN=32 YELLOW=33 BLUE=34 RESET=0' + "\\n" +
        '  不认识的名字输出 "名字=UNKNOWN"。' + "\\n" +
        '  完整写法是 ESC[<码值>m，本题只要码值。',
      starter: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char name[32];

    while (scanf("%31s", name) == 1) {
        int code = -1;

        /* TODO: 用 strcmp 把 name 映射成 code */

        if (code >= 0)
            printf("%s=%d\n", name, code);
        else
            printf("%s=UNKNOWN\n", name);
    }
    return 0;
}`,
      solution: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char name[32];

    while (scanf("%31s", name) == 1) {
        int code = -1;

        if (strcmp(name, "RED") == 0)         code = 31;
        else if (strcmp(name, "GREEN") == 0)  code = 32;
        else if (strcmp(name, "YELLOW") == 0) code = 33;
        else if (strcmp(name, "BLUE") == 0)   code = 34;
        else if (strcmp(name, "RESET") == 0)  code = 0;

        if (code >= 0)
            printf("%s=%d\n", name, code);
        else
            printf("%s=UNKNOWN\n", name);
    }
    return 0;
}`,
      cases: [
        { in: 'RED GREEN\n', expect: 'RED=31\nGREEN=32\n' },
        { in: 'YELLOW BLUE RESET\n', expect: 'YELLOW=33\nBLUE=34\nRESET=0\n' },
        { in: 'PINK\n', expect: 'PINK=UNKNOWN\n' }
      ],
      hints: [
        '字符串比较用 strcmp，相等时返回 0。',
        '写完 strcmp(name, "RED") == 0 这样的判断链就行。',
        '映射不到的（比如 PINK）走 else 分支输出 UNKNOWN。'
      ]
    },

    {
      id: 'g4',
      ch: '游戏·控制台',
      title: '算出方框的四条边和中心',
      level: 4,
      task: '画方框要用 gotoxy 定位光标。这里不真画，只算坐标：w×h 的方框，四条边各有几个点、中心在哪。',
      detail:
        '输入：两个整数 w h（宽和高）。' + "\\n" +
        '输出：五行。' + "\\n" +
        '  依次输出：上边点数、下边点数、左边点数、右边点数，各占一行；' + "\\n" +
        '  最后一行是中心坐标 "cx cy"，cx = w / 2，cy = h / 2（整数除法）。',
      starter: R`#include <stdio.h>

int main(void) {
    int w, h;
    scanf("%d %d", &w, &h);

    int top = 0, bottom = 0, left = 0, right = 0;

    /* TODO: 四条边各有多少个点 */

    printf("%d\n", top);
    printf("%d\n", bottom);
    printf("%d\n", left);
    printf("%d\n", right);
    printf("%d %d\n", w / 2, h / 2);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int w, h;
    scanf("%d %d", &w, &h);

    int top = w;
    int bottom = w;
    int left = h;
    int right = h;

    printf("%d\n", top);
    printf("%d\n", bottom);
    printf("%d\n", left);
    printf("%d\n", right);
    printf("%d %d\n", w / 2, h / 2);
    return 0;
}`,
      cases: [
        { in: '20 8\n', expect: '20\n20\n8\n8\n10 4\n' },
        { in: '5 3\n', expect: '5\n5\n3\n3\n2 1\n' },
        { in: '1 1\n', expect: '1\n1\n1\n1\n0 0\n' }
      ],
      hints: [
        '横边的点数就是宽度 w，竖边的点数就是高度 h。',
        '中心用整数除法：w / 2、h / 2。',
        'w=1、h=1 这种情况也要能正确输出。'
      ]
    },

    /* ───────── 输入 ───────── */
    {
      id: 'g5',
      ch: '游戏·输入',
      title: '把按键变成方向',
      level: 3,
      task: '读入一串字符（w/a/s/d），把它翻译成方向数字，并统计各方几次。',
      detail:
        '输入：一行字符（只含 w a s d，小写，长度 1~20）。\n' +
        '输出：共 5 行。前 4 行是每个方向出现的次数，最后一行是最终方向。\n' +
        '格式：\n' +
        '  w:次数\n  a:次数\n  s:次数\n  d:次数\n' +
        '  最终方向:UP / LEFT / DOWN / RIGHT\n' +
        '规则：后出现的按键覆盖前面的（模拟"按最后一次方向走"）。\n' +
        '如果没有按键，最终方向是 UP。',
      starter: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char s[32];
    scanf("%s", s);

    /* TODO: 统计每个键的次数，并记录最后一次的方向 */

    return 0;
}`,
      solution: R`#include <stdio.h>
#include <string.h>

int main(void) {
    char s[32];
    scanf("%s", s);

    int cnt[4] = {0};   /* up, left, down, right */
    int dir = 0;        /* 默认 UP */
    int i;

    for (i = 0; s[i]; i++) {
        switch (s[i]) {
            case 'w': cnt[0]++; dir = 0; break;
            case 'a': cnt[1]++; dir = 1; break;
            case 's': cnt[2]++; dir = 2; break;
            case 'd': cnt[3]++; dir = 3; break;
            default: break;
        }
    }

    printf("w:%d\n", cnt[0]);
    printf("a:%d\n", cnt[1]);
    printf("s:%d\n", cnt[2]);
    printf("d:%d\n", cnt[3]);

    const char *names[4] = {"UP", "LEFT", "DOWN", "RIGHT"};
    printf("最终方向:%s\n", names[dir]);
    return 0;
}`,
      cases: [
        { in: 'wwasd\n', expect: 'w:2\na:1\ns:1\nd:1\n最终方向:RIGHT\n' },
        { in: 'd\n', expect: 'w:0\na:0\ns:0\nd:1\n最终方向:RIGHT\n' },
        { in: 'as\n', expect: 'w:0\na:1\ns:1\nd:0\n最终方向:DOWN\n' }
      ],
      hints: [
        '用 case 把字符映射成方向下标，count 数组顺手就统计了。',
        '每次 switch 命中都覆盖 dir，自然就是"最后一次"。',
        'names[] 字符串数组把数字变成可读名字，比四个 if 清爽。'
      ]
    },

    {
      id: 'g6',
      ch: '游戏·输入',
      title: '处理方向键的双字节编码',
      level: 4,
      task: 'Windows 下方向键第一次读会返回 224，第二次才是真正的键码。模拟这个解码过程。',
      detail:
        '输入：第一行 m（1~10）；接下来 m 行，每行是若干整数（代表从输入缓冲区读到的字节序列）。\n' +
        '输出：每行输入解析出一个方向，输出 UP / DOWN / LEFT / RIGHT / UNKNOWN。\n' +
        '规则：\n' +
        '  - 遇到 224（或 0）时，它是方向键的前导字节，后面那个数才是键码\n' +
        '  - 键码 72=UP, 80=DOWN, 75=LEFT, 77=RIGHT\n' +
        '  - 其他键码输出 UNKNOWN\n' +
        '  - 如果 224 之后再没有数了，输出 UNKNOWN',
      starter: R`#include <stdio.h>

int main(void) {
    int m;
    scanf("%d", &m);

    for (int i = 0; i < m; i++) {
        int len;
        int vals[10];

        scanf("%d", &len);
        for (int j = 0; j < len; j++)
            scanf("%d", &vals[j]);

        /* TODO: 解析这一行，输出一个方向 */
    }
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int m;
    scanf("%d", &m);

    for (int i = 0; i < m; i++) {
        int len;
        int vals[10];

        scanf("%d", &len);
        for (int j = 0; j < len; j++)
            scanf("%d", &vals[j]);

        int code = -1;

        if (len >= 2 && (vals[0] == 224 || vals[0] == 0)) {
            code = vals[1];
        } else if (len >= 1) {
            code = vals[0];
        }

        switch (code) {
            case 72: printf("UP\n"); break;
            case 80: printf("DOWN\n"); break;
            case 75: printf("LEFT\n"); break;
            case 77: printf("RIGHT\n"); break;
            default: printf("UNKNOWN\n"); break;
        }
    }
    return 0;
}`,
      cases: [
        { in: '3\n2 224 72\n2 224 80\n1 113\n', expect: 'UP\nDOWN\nUNKNOWN\n' },
        { in: '3\n2 224 75\n2 224 77\n2 224 1\n', expect: 'LEFT\nRIGHT\nUNKNOWN\n' },
        { in: '2\n1 224\n2 0 72\n', expect: 'UNKNOWN\nUP\n' }
      ],
      hints: [
        '先判断长度够不够——只有一个数的时候没有第二个键码可读。',
        '如果第一个是 224 或 0，说明这是方向键，真正的键码是第二个数。',
        '这是 kbhit + _getch 读方向键的标准写法：if (key == 0 || key == 224) key = _getch();'
      ]
    },

    /* ───────── 动态内存 ───────── */
    {
      id: 'g7',
      ch: '游戏·内存',
      title: '用 malloc 建一个动态数组并释放',
      level: 4,
      task: '读入 n，用 malloc 申请 n 个 int，读入数据求和，最后 free 掉。',
      detail:
        '输入：第一行 n（1 <= n <= 100）；第二行 n 个整数。\n' +
        '输出：总和，行尾换行。\n' +
        '要求：必须用 malloc 分配，用 free 释放，不许用固定长度数组。\n' +
        '注意malloc 返回 void*，要给 int* 转换；失败时返回 NULL 要判空。',
      starter: R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);

    /* TODO: int *a = malloc(n * sizeof(int)); 判空、读入、求和、free */

    return 0;
}`,
      solution: R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int *a = (int *)malloc(n * sizeof(int));
    if (a == NULL) {
        printf("0\n");
        return 0;
    }

    int sum = 0;
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
        sum += a[i];
    }

    printf("%d\n", sum);

    free(a);
    return 0;
}`,
      cases: [
        { in: '5\n1 2 3 4 5\n', expect: '15\n' },
        { in: '1\n42\n', expect: '42\n' },
        { in: '3\n-1 0 1\n', expect: '0\n' }
      ],
      hints: [
        'malloc(n * sizeof(int)) 申请 n 个 int 的空间，返回值要判 NULL。',
        '用起来和普通数组一样：a[i]。',
        '用完必须 free(a)，否则就是内存泄漏。'
      ]
    },

    {
      id: 'g8',
      ch: '游戏·内存',
      title: '用 realloc 让数组变长',
      level: 5,
      task: '读入一串数（个数事先不知道，第一行是 n），边读边用 realloc 扩容，最后输出。',
      detail:
        '输入：第一行 n（1 <= n <= 50）；接下来 n 行，每行一个整数。\n' +
        '输出：把这些数按读入顺序输出（空格分隔），行尾换行。\n' +
        '要求：初始只申请 4 个元素，不够了用 realloc 翻倍。\n' +
        '（这是"扩容"的思路——游戏里存不固定数量的对象都这么干。）',
      starter: R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int cap = 4;
    int cnt = 0;
    int *a = (int *)malloc(cap * sizeof(int));

    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);

        /* TODO: 如果 cnt == cap，用 realloc 把容量翻倍 */

        a[cnt++] = v;
    }

    for (int i = 0; i < cnt; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");

    free(a);
    return 0;
}`,
      solution: R`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);

    int cap = 4;
    int cnt = 0;
    int *a = (int *)malloc(cap * sizeof(int));

    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);

        if (cnt == cap) {
            cap *= 2;
            a = (int *)realloc(a, cap * sizeof(int));
        }

        a[cnt++] = v;
    }

    for (int i = 0; i < cnt; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");

    free(a);
    return 0;
}`,
      cases: [
        { in: '5\n1 2 3 4 5\n', expect: '1 2 3 4 5\n' },
        { in: '1\n9\n', expect: '9\n' },
        { in: '10\n1 2 3 4 5 6 7 8 9 10\n', expect: '1 2 3 4 5 6 7 8 9 10\n' }
      ],
      hints: [
        '条件就是"满了"：cnt == cap 时扩容。',
        'realloc 的返回值要重新赋给 a（地址可能变了）。',
        '翻倍扩容是均摊 O(1) 的关键，每次只加 1 会变成 O(n²)。'
      ]
    }
  );
})(typeof globalThis !== 'undefined' ? globalThis : this);
