/* ===========================================================
   C 语言闯关 · 算法进阶实操题（12 道）

   难度 3-5 星，方向：
     递归回溯 · 排序 · 二分查找 · 动态规划入门 · 双指针 · 位运算

   加题规则（和基础题一样）：
     - expect 由参考解答实跑生成，不手写
     - 额外要求：每题再写一个"暴力解法"，用随机数据对拍，
       确认参考解答在边界上也没错（见 build/audit-algo.js）
   =========================================================== */
(function (root) {
  const R = String.raw;
  const HQ = root.HQ || (root.HQ = []);

  HQ.push(

    /* ───────────── 递归 / 回溯 ───────────── */
    {
      id: 'a1',
      ch: '递归与回溯',
      title: '递归求幂（快速幂）',
      level: 3,
      task: '实现 pow_int(base, exp)，计算 base 的 exp 次方。要求用快速幂，不能循环 exp 次。',
      detail:
        '输入：两个整数 base 和 exp（0 <= exp <= 30，|base| <= 10）。\n' +
        '输出：base^exp 的值，行尾换行。\n' +
        '要求：时间复杂度要 O(log exp)，不许写 for (i = 0; i < exp; i++) 那种线性循环。',
      starter: R`#include <stdio.h>

long long pow_int(long long base, int exp) {
    /* TODO: 快速幂
       思路：base^exp =
         exp 是偶数 -> (base^(exp/2))^2
         exp 是奇数 -> base * base^(exp-1)
       注意出口：exp == 0 时返回 1 */
    return 0;
}

int main(void) {
    long long base;
    int exp;
    scanf("%lld %d", &base, &exp);
    printf("%lld\n", pow_int(base, exp));
    return 0;
}`,
      solution: R`#include <stdio.h>

long long pow_int(long long base, int exp) {
    if (exp == 0) return 1;
    if (exp % 2 == 0) {
        long long half = pow_int(base, exp / 2);
        return half * half;
    }
    return base * pow_int(base, exp - 1);
}

int main(void) {
    long long base;
    int exp;
    scanf("%lld %d", &base, &exp);
    printf("%lld\n", pow_int(base, exp));
    return 0;
}`,
      cases: [
        { in: '2 10\n', expect: '1024\n' },
        { in: '2 0\n', expect: '1\n' },
        { in: '3 5\n', expect: '243\n' },
        { in: '-2 3\n', expect: '-8\n' },
        { in: '-2 4\n', expect: '16\n' },
        { in: '10 9\n', expect: '1000000000\n' }
      ],
      hints: [
        '递归的出口是 exp == 0，任何数的 0 次方都是 1。',
        '偶数次方可以折半：base^10 = (base^5)^2，这样规模立刻减半。',
        '奇数次方先拆一个出来变成偶数：base^5 = base * base^4。别写成 exp-1 后还调原来的写法，会退化成线性。'
      ],
      /* 对拍：和"循环乘 exp 次"的暴力解对比 */
      brutal: R`#include <stdio.h>
int main(void) {
    long long base; int exp;
    scanf("%lld %d", &base, &exp);
    long long r = 1;
    for (int i = 0; i < exp; i++) r *= base;
    printf("%lld\n", r);
    return 0;
}`,
      fuzz: { gen: 'base', n: 30 }
    },

    {
      id: 'a2',
      ch: '递归与回溯',
      title: '汉诺塔步数',
      level: 3,
      task: '读入盘子数 n，输出把 n 个盘子从 A 柱移到 C 柱需要的步数，以及每一步怎么移。',
      detail:
        '输入：一个整数 n（1 <= n <= 10）。\n' +
        '输出：第一行是总步数；接下来每行一步，格式 "A->C"（从哪根柱到哪根柱）。\n' +
        '柱子用 A、B、C 表示，规则是每次只能移一个盘、大盘不能压小盘。',
      starter: R`#include <stdio.h>

/* 把 n 个盘从 from 借 via 移到 to，同时打印每一步 */
void hanoi(int n, char from, char via, char to) {
    /* TODO: 三步走
       1. 把上面 n-1 个从 from 移到 via（借 to）
       2. 把最大的那个从 from 移到 to，打印这一步
       3. 把 n-1 个从 via 移到 to（借 from） */
}

int main(void) {
    int n;
    scanf("%d", &n);

    /* 总步数是 2^n - 1 */
    int steps = 1;
    for (int i = 0; i < n; i++) steps *= 2;
    printf("%d\n", steps - 1);

    hanoi(n, 'A', 'B', 'C');
    return 0;
}`,
      solution: R`#include <stdio.h>

void hanoi(int n, char from, char via, char to) {
    if (n == 0) return;
    hanoi(n - 1, from, to, via);
    printf("%c->%c\n", from, to);
    hanoi(n - 1, via, from, to);
}

int main(void) {
    int n;
    scanf("%d", &n);
    int steps = 1;
    for (int i = 0; i < n; i++) steps *= 2;
    printf("%d\n", steps - 1);
    hanoi(n, 'A', 'B', 'C');
    return 0;
}`,
      cases: [
        { in: '1\n', expect: '1\nA->C\n' },
        { in: '2\n', expect: '3\nA->B\nA->C\nB->C\n' },
        { in: '3\n', expect: '7\nA->C\nA->B\nC->B\nA->C\nB->A\nB->C\nA->C\n' }
      ],
      hints: [
        '递归的思路是"先把上面 n-1 个挪开，处理最底下那个，再把 n-1 个挪回来"。',
        '注意参数顺序会换：第一步调用时 via 和 to 交换了位置。',
        '三步：hanoi(n-1, from, to, via);  打印 from->to;  hanoi(n-1, via, from, to);'
      ]
    },

    {
      id: 'a3',
      ch: '递归与回溯',
      title: '全排列',
      level: 4,
      task: '读入 n 个不重复的数字，按字典序输出它们的全排列，每个排列一行。',
      detail:
        '输入：第一行 n（1 <= n <= 6），第二行 n 个互不相同的整数。\n' +
        '输出：所有全排列，每行一个，数字之间一个空格，按字典序排列。\n' +
        '提示：先把数组排序，回溯时依次尝试每个没用过的数。',
      starter: R`#include <stdio.h>

int n;
int a[8];
int used[8];
int path[8];

void dfs(int depth) {
    if (depth == n) {
        for (int i = 0; i < n; i++) {
            if (i > 0) printf(" ");
            printf("%d", path[i]);
        }
        printf("\n");
        return;
    }
    /* TODO: 依次尝试每个还没用过的数
       for (int i = 0; i < n; i++) {
           if (used[i]) continue;
           ... 选它、标记、递归、取消标记
       } */
}

int main(void) {
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    /* 先排序，保证输出是字典序 */
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
            }

    dfs(0);
    return 0;
}`,
      solution: R`#include <stdio.h>

int n;
int a[8];
int used[8];
int path[8];

void dfs(int depth) {
    if (depth == n) {
        for (int i = 0; i < n; i++) {
            if (i > 0) printf(" ");
            printf("%d", path[i]);
        }
        printf("\n");
        return;
    }
    for (int i = 0; i < n; i++) {
        if (used[i]) continue;
        used[i] = 1;
        path[depth] = a[i];
        dfs(depth + 1);
        used[i] = 0;
    }
}

int main(void) {
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
            }

    dfs(0);
    return 0;
}`,
      cases: [
        { in: '2\n2 1\n', expect: '1 2\n2 1\n' },
        { in: '3\n1 2 3\n', expect: '1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1\n' },
        { in: '1\n7\n', expect: '7\n' }
      ],
      hints: [
        '回溯的骨架：选一个 -> 递归 -> 撤销选择。撤销那步最容易被忘掉。',
        '用 used[] 数组标记"这个数这轮用过了"。',
        '字典序不是靠回溯天然保证的——必须先把原数组排序。'
      ]
    },

    /* ───────────── 排序 ───────────── */
    {
      id: 'a4',
      ch: '排序',
      title: '冒泡排序（并统计交换次数）',
      level: 3,
      task: '读入 n 个数，用冒泡排序升序排好并输出，同时输出总共发生了几次交换。',
      detail:
        '输入：第一行 n（1 <= n <= 100），第二行 n 个整数。\n' +
        '输出：第一行是排好序的数列（空格分隔）；第二行是交换次数。\n' +
        '注意：必须是标准冒泡（相邻两个比较，逆序就换），别偷偷用 qsort。',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int swaps = 0;

    /* TODO: 冒泡排序，每次真的交换 a[j] 和 a[j+1]，并让 swaps++ */

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n%d\n", swaps);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int swaps = 0;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                swaps++;
            }
        }
    }

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n%d\n", swaps);
    return 0;
}`,
      cases: [
        { in: '5\n3 1 4 1 5\n', expect: '1 1 3 4 5\n3\n' },
        { in: '3\n1 2 3\n', expect: '1 2 3\n0\n' },
        { in: '3\n3 2 1\n', expect: '1 2 3\n3\n' },
        { in: '1\n7\n', expect: '7\n0\n' }
      ],
      hints: [
        '冒泡的内层只要走到 n-1-i，因为末尾 i 个已经排好了。',
        '交换次数每做一次真正的 swap 就加一，不是每次比较都加。',
        '已经有序的输入交换次数是 0，这个用例很容易暴露出写错的地方。'
      ],
      brutal: R`#include <stdio.h>
int main(void) {
    int n; scanf("%d", &n);
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int swaps = 0;
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) { int t=a[j]; a[j]=a[j+1]; a[j+1]=t; swaps++; }
    for (int i = 0; i < n; i++) printf(i ? " %d" : "%d", a[i]);
    printf("\n%d\n", swaps);
    return 0;
}`,
      fuzz: { gen: 'array', n: 12 }
    },

    {
      id: 'a5',
      ch: '排序',
      title: '快速排序（自己实现 partition）',
      level: 4,
      task: '读入 n 个数，用快速排序升序排好并输出。核心是 partition 函数要自己写。',
      detail:
        '输入：第一行 n（1 <= n <= 200），第二行 n 个整数（可能重复）。\n' +
        '输出：排好序的数列，空格分隔，行尾换行。\n' +
        '要求：必须真的实现 quicksort（递归 + partition），不许用库里的排序函数。',
      starter: R`#include <stdio.h>

void swap(int *x, int *y) {
    int t = *x; *x = *y; *y = t;
}

/* 以 a[hi] 为基准，把小的一拨放左边、大的一拨放右边，
   返回基准最后待的位置 */
int partition(int a[], int lo, int hi) {
    /* TODO: 常用写法是 Lomuto：
       pivot = a[hi]; i = lo - 1;
       遍历 j 从 lo 到 hi-1，若 a[j] <= pivot 就 i++ 然后 swap(a[i], a[j]);
       最后 swap(a[i+1], a[hi]); return i + 1; */
    return lo;
}

void quicksort(int a[], int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quicksort(a, lo, p - 1);
    quicksort(a, p + 1, hi);
}

int main(void) {
    int n;
    scanf("%d", &n);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    quicksort(a, 0, n - 1);

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");
    return 0;
}`,
      solution: R`#include <stdio.h>

void swap(int *x, int *y) {
    int t = *x; *x = *y; *y = t;
}

int partition(int a[], int lo, int hi) {
    int pivot = a[hi];
    int i = lo - 1;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) {
            i++;
            swap(&a[i], &a[j]);
        }
    }
    swap(&a[i + 1], &a[hi]);
    return i + 1;
}

void quicksort(int a[], int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quicksort(a, lo, p - 1);
    quicksort(a, p + 1, hi);
}

int main(void) {
    int n;
    scanf("%d", &n);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    quicksort(a, 0, n - 1);

    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\n");
    return 0;
}`,
      cases: [
        { in: '5\n3 1 4 1 5\n', expect: '1 1 3 4 5\n' },
        { in: '1\n42\n', expect: '42\n' },
        { in: '6\n6 5 4 3 2 1\n', expect: '1 2 3 4 5 6\n' },
        { in: '4\n2 2 2 2\n', expect: '2 2 2 2\n' }
      ],
      hints: [
        'i 记录"小于等于基准的区域"的右边界，一开始是 lo-1。',
        '循环走完，把基准换到 i+1 的位置，那个位置就是它的最终位置。',
        '注意条件是 a[j] <= pivot，写 < 在重复元素多的时候会出问题。'
      ],
      brutal: R`#include <stdio.h>
int main(void) {
    int n; scanf("%d", &n);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n - 1; i++)
        for (int j = i + 1; j < n; j++)
            if (a[i] > a[j]) { int t = a[i]; a[i] = a[j]; a[j] = t; }
    for (int i = 0; i < n; i++) printf(i ? " %d" : "%d", a[i]);
    printf("\n");
    return 0;
}`,
      fuzz: { gen: 'array', n: 15 }
    },

    /* ───────────── 查找 ───────────── */
    {
      id: 'a6',
      ch: '二分查找',
      title: '二分查找（返回下标）',
      level: 3,
      task: '在一个升序数组里找目标值，返回它的下标（从 0 开始），找不到输出 -1。',
      detail:
        '输入：第一行 n 和目标值 target；第二行 n 个**升序**整数。\n' +
        '输出：target 的下标，或 -1，行尾换行。\n' +
        '要求：必须用二分查找（O(log n)），不许从头到尾扫。',
      starter: R`#include <stdio.h>

int main(void) {
    int n, target;
    scanf("%d %d", &n, &target);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int lo = 0, hi = n - 1;
    int ans = -1;

    /* TODO: while (lo <= hi) { mid = (lo+hi)/2; ... } */

    printf("%d\n", ans);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n, target;
    scanf("%d %d", &n, &target);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int lo = 0, hi = n - 1;
    int ans = -1;

    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) { ans = mid; break; }
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }

    printf("%d\n", ans);
    return 0;
}`,
      cases: [
        { in: '5 3\n1 2 3 4 5\n', expect: '2\n' },
        { in: '5 1\n1 2 3 4 5\n', expect: '0\n' },
        { in: '5 5\n1 2 3 4 5\n', expect: '4\n' },
        { in: '5 9\n1 2 3 4 5\n', expect: '-1\n' },
        { in: '1 7\n7\n', expect: '0\n' },
        { in: '1 3\n7\n', expect: '-1\n' }
      ],
      hints: [
        '循环条件是 lo <= hi，不是 lo < hi —— 差一就会漏掉只剩一个元素的情况。',
        'mid 用 lo + (hi - lo) / 2 比 (lo + hi) / 2 更安全（不会溢出，虽然这题数据小）。',
        '根据 a[mid] 和 target 的大小关系，缩掉一半：小了就往右找（lo = mid+1），大了往左找（hi = mid-1）。'
      ],
      brutal: R`#include <stdio.h>
int main(void) {
    int n, t; scanf("%d %d", &n, &t);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int ans = -1;
    for (int i = 0; i < n; i++) if (a[i] == t) { ans = i; break; }
    printf("%d\n", ans);
    return 0;
}`,
      fuzz: { gen: 'sorted', n: 10 }
    },

    {
      id: 'a7',
      ch: '二分查找',
      title: '二分答案：求平方根整数部分',
      level: 5,
      task: '读入一个非负整数 x，输出 ⌊√x⌋（平方根的整数部分）。不许用 sqrt()。',
      detail:
        '输入：一个非负整数 x（0 <= x <= 2,000,000,000）。\n' +
        '输出：⌊√x⌋，行尾换行。\n' +
        '要求：用二分答案的思路 —— 在 [0, x] 里二分找最大的 mid 使得 mid*mid <= x。\n' +
        '注意 mid*mid 可能溢出 int，要用 long long。',
      starter: R`#include <stdio.h>

int main(void) {
    long long x;
    scanf("%lld", &x);

    long long lo = 0, hi = x, ans = 0;

    /* TODO: 二分找最大的 mid 使 mid*mid <= x */

    printf("%lld\n", ans);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    long long x;
    scanf("%lld", &x);

    long long lo = 0, hi = x, ans = 0;

    while (lo <= hi) {
        long long mid = lo + (hi - lo) / 2;
        if (mid * mid <= x) {
            ans = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    printf("%lld\n", ans);
    return 0;
}`,
      cases: [
        { in: '9\n', expect: '3\n' },
        { in: '8\n', expect: '2\n' },
        { in: '0\n', expect: '0\n' },
        { in: '1\n', expect: '1\n' },
        { in: '2000000000\n', expect: '44721\n' }
      ],
      hints: [
        '二分答案的关键：这个问题的答案有单调性——如果 m 满足 m*m<=x，那么比 m 小的都满足。',
        '所以可以二分"最大满足条件的 m"：满足就往右试（lo = mid+1），不满足往左退。',
        'mid * mid 在 x 接近 2e9 时会超过 int 上限（约 2.1e9），必须用 long long。'
      ],
      brutal: R`#include <stdio.h>
int main(void) {
    long long x; scanf("%lld", &x);
    long long r = 0;
    while ((r + 1) * (r + 1) <= x) r++;
    printf("%lld\n", r);
    return 0;
}`,
      fuzz: { gen: 'sqrt', n: 5 }
    },

    /* ───────────── 动态规划 ───────────── */
    {
      id: 'a8',
      ch: '动态规划',
      title: '爬楼梯',
      level: 3,
      task: '有 n 级台阶，每次可以走 1 级或 2 级，问有多少种不同的走法。',
      detail:
        '输入：一个整数 n（1 <= n <= 40）。\n' +
        '输出：走法总数，行尾换行。\n' +
        '提示：f(n) = f(n-1) + f(n-2)，但请用循环而不是递归（递归会重复计算）。',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    /* TODO: 用两个变量滚动递推。
       f(1) = 1, f(2) = 2
       之后 f(i) = f(i-1) + f(i-2) */

    printf("%d\n", 0);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);

    if (n == 1) { printf("1\n"); return 0; }
    if (n == 2) { printf("2\n"); return 0; }

    long long a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        long long c = a + b;
        a = b;
        b = c;
    }
    printf("%lld\n", b);
    return 0;
}`,
      cases: [
        { in: '1\n', expect: '1\n' },
        { in: '2\n', expect: '2\n' },
        { in: '3\n', expect: '3\n' },
        { in: '5\n', expect: '8\n' },
        { in: '10\n', expect: '89\n' },
        { in: '40\n', expect: '165580141\n' }
      ],
      hints: [
        '走到第 n 级，最后一步要么是从 n-1 迈 1 级，要么是从 n-2 迈 2 级。',
        '所以总数 = f(n-1) + f(n-2)，这正是斐波那契的递推式。',
        'n=1 和 n=2 是边界，必须单独处理，否则循环里会算错。40 级的结果超过 int 吗？想想 165580141。'
      ],
      brutal: R`#include <stdio.h>
long long f(int n) {
    if (n == 1) return 1;
    if (n == 2) return 2;
    return f(n - 1) + f(n - 2);
}
int main(void) {
    int n; scanf("%d", &n);
    printf("%lld\n", f(n));
    return 0;
}`,
      fuzz: { gen: 'smalln', n: 10 }
    },

    {
      id: 'a9',
      ch: '动态规划',
      title: '最大连续子段和',
      level: 4,
      task: '读入 n 个整数（可能全为负），求连续子段的最大和。',
      detail:
        '输入：第一行 n（1 <= n <= 100），第二行 n 个整数（|值| <= 1000）。\n' +
        '输出：最大连续子段和，行尾换行。\n' +
        '注意：子段必须非空。如果全是负数，答案就是最大的那个负数，不是 0。\n' +
        '要求：用 O(n) 的 Kadane 算法。',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    /* TODO: Kadane
       cur = 以当前位置结尾的最大和
       best = 目前为止见过的最大和
       cur = max(a[i], cur + a[i])   <- 关键：前面那段是"拖累"就丢掉 */

    printf("%d\n", 0);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int cur = a[0], best = a[0];
    for (int i = 1; i < n; i++) {
        cur = (cur + a[i] > a[i]) ? (cur + a[i]) : a[i];
        if (cur > best) best = cur;
    }

    printf("%d\n", best);
    return 0;
}`,
      cases: [
        { in: '5\n1 -2 3 4 -1\n', expect: '7\n' },
        { in: '3\n-1 -2 -3\n', expect: '-1\n' },
        { in: '1\n-5\n', expect: '-5\n' },
        { in: '6\n2 -1 2 3 -9 4\n', expect: '6\n' },
        { in: '4\n-2 1 -3 4\n', expect: '4\n' }
      ],
      hints: [
        'cur 表示"以 i 结尾"的最大和。如果 cur + a[i] 比 a[i] 还小，说明前面那段不如不要。',
        'cur 和 best 都要初始化成 a[0]，不是 0 —— 全负数的用例会立刻暴露这个问题。',
        '每次更新完 cur 就拿去和 best 比一下。'
      ],
      brutal: R`#include <stdio.h>
int main(void) {
    int n; scanf("%d", &n);
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int best = a[0];
    for (int i = 0; i < n; i++) {
        int s = 0;
        for (int j = i; j < n; j++) { s += a[j]; if (s > best) best = s; }
    }
    printf("%d\n", best);
    return 0;
}`,
      fuzz: { gen: 'signed', n: 10 }
    },

    {
      id: 'a10',
      ch: '动态规划',
      title: '0-1 背包',
      level: 5,
      task: '有 n 件物品，每件有重量和价值，背包容量为 W。每件最多拿一次，求能装下的最大价值。',
      detail:
        '输入：第一行 n 和 W（1 <= n <= 50，1 <= W <= 1000）；接下来 n 行，每行是 "重量 价值"。\n' +
        '输出：最大总价值，行尾换行。\n' +
        '要求：用一维数组倒序更新的 0-1 背包写法。',
      starter: R`#include <stdio.h>

int main(void) {
    int n, W;
    scanf("%d %d", &n, &W);

    int wt[55], val[55];
    for (int i = 0; i < n; i++)
        scanf("%d %d", &wt[i], &val[i]);

    int dp[1005] = {0};

    /* TODO: 对每件物品，倒序遍历容量 w 从 W 到 wt[i]
       dp[w] = max(dp[w], dp[w - wt[i]] + val[i])
       倒序是为了保证每件物品只被用一次 */

    printf("%d\n", dp[W]);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n, W;
    scanf("%d %d", &n, &W);

    int wt[55], val[55];
    for (int i = 0; i < n; i++)
        scanf("%d %d", &wt[i], &val[i]);

    int dp[1005] = {0};

    for (int i = 0; i < n; i++) {
        for (int w = W; w >= wt[i]; w--) {
            int take = dp[w - wt[i]] + val[i];
            if (take > dp[w]) dp[w] = take;
        }
    }

    printf("%d\n", dp[W]);
    return 0;
}`,
      cases: [
        { in: '3 10\n5 10\n4 40\n6 30\n', expect: '70\n' },
        { in: '1 5\n6 100\n', expect: '0\n' },
        { in: '3 5\n1 1\n2 2\n3 3\n', expect: '5\n' },
        { in: '4 10\n2 6\n2 3\n6 5\n5 4\n', expect: '14\n' }
      ],
      hints: [
        'dp[w] 表示"容量为 w 时能装的最大价值"。',
        '关键在倒序：如果正序（w 从 wt[i] 到 W），同一件物品可能被重复塞进去好几次。',
        '拿它和不拿它取最大：dp[w] = max(dp[w], dp[w-wt] + val)。'
      ],
      brutal: R`#include <stdio.h>
int n, W, wt[55], val[55], best = 0;
void dfs(int i, int curW, int curV) {
    if (curV > best) best = curV;
    if (i == n) return;
    dfs(i + 1, curW, curV);
    if (curW + wt[i] <= W) dfs(i + 1, curW + wt[i], curV + val[i]);
}
int main(void) {
    scanf("%d %d", &n, &W);
    for (int i = 0; i < n; i++) scanf("%d %d", &wt[i], &val[i]);
    dfs(0, 0, 0);
    printf("%d\n", best);
    return 0;
}`,
      fuzz: { gen: 'knapsack', n: 12 }
    },

    /* ───────────── 双指针 / 其他 ───────────── */
    {
      id: 'a11',
      ch: '双指针',
      title: '两数之和（有序数组）',
      level: 4,
      task: '在一个升序数组里找两个数，使它们的和等于 target，输出它们的下标。',
      detail:
        '输入：第一行 n 和 target；第二行 n 个升序整数。\n' +
        '输出：两个下标（小的在前），空格分隔；无解输出 "no"。\n' +
        '要求：用双指针（O(n)），不许两层循环。\n' +
        '保证最多只有一组解。',
      starter: R`#include <stdio.h>

int main(void) {
    int n, target;
    scanf("%d %d", &n, &target);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int l = 0, r = n - 1;
    int found = 0;

    /* TODO: 双指针
       和太小 -> 左指针右移（需要更大的数）
       和太大 -> 右指针左移（需要更小的数） */

    if (!found) printf("no\n");
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    int n, target;
    scanf("%d %d", &n, &target);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int l = 0, r = n - 1;
    int found = 0;

    while (l < r) {
        int s = a[l] + a[r];
        if (s == target) {
            printf("%d %d\n", l, r);
            found = 1;
            break;
        } else if (s < target) {
            l++;
        } else {
            r--;
        }
    }

    if (!found) printf("no\n");
    return 0;
}`,
      cases: [
        { in: '5 9\n1 2 3 4 5\n', expect: '3 4\n' },
        { in: '5 100\n1 2 3 4 5\n', expect: 'no\n' },
        { in: '2 3\n1 2\n', expect: '0 1\n' },
        { in: '4 6\n1 2 3 4\n', expect: '1 3\n' }
      ],
      hints: [
        '数组有序是关键 —— 有序才能用双指针。',
        '当前和比 target 小，说明左边的数太小了，l 往右移；比 target 大就把 r 往左移。',
        '循环条件是 l < r，不能是 l <= r（那样同一个数会被用两次）。'
      ],
      brutal: R`#include <stdio.h>
int main(void) {
    int n, t; scanf("%d %d", &n, &t);
    int a[205];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (a[i] + a[j] == t) { printf("%d %d\n", i, j); return 0; }
    printf("no\n");
    return 0;
}`,
      fuzz: { gen: 'twosum', n: 10 }
    },

    {
      id: 'a12',
      ch: '位运算与综合',
      title: '统计二进制里 1 的个数',
      level: 4,
      task: '读入一个非负整数，输出它二进制表示里有多少个 1。',
      detail:
        '输入：一个非负整数 n（0 <= n <= 2^31-1）。\n' +
        '输出：二进制中 1 的个数，行尾换行。\n' +
        '要求：用 n &= (n - 1) 这个技巧，它每执行一次就消掉最低位的 1。\n' +
        '（循环 32 次逐个检查也行，但要求用这个技巧。）',
      starter: R`#include <stdio.h>

int main(void) {
    unsigned int n;
    scanf("%u", &n);

    int cnt = 0;

    /* TODO: while (n) { n &= (n - 1); cnt++; } */

    printf("%d\n", cnt);
    return 0;
}`,
      solution: R`#include <stdio.h>

int main(void) {
    unsigned int n;
    scanf("%u", &n);

    int cnt = 0;
    while (n) {
        n &= (n - 1);
        cnt++;
    }

    printf("%d\n", cnt);
    return 0;
}`,
      cases: [
        { in: '0\n', expect: '0\n' },
        { in: '1\n', expect: '1\n' },
        { in: '7\n', expect: '3\n' },
        { in: '1024\n', expect: '1\n' },
        { in: '2147483647\n', expect: '31\n' }
      ],
      hints: [
        'n - 1 会把最低位的 1 变成 0，把它的低位全变成 1；再和 n 做 &= 正好抹掉那个 1。',
        '所以要循环，每轮消掉一个 1，循环几次就有几个 1。',
        '用 unsigned int 避免符号位的坑，读入用 %u。'
      ],
      brutal: R`#include <stdio.h>
int main(void) {
    unsigned int n; scanf("%u", &n);
    int c = 0;
    for (int i = 0; i < 32; i++) if ((n >> i) & 1) c++;
    printf("%d\n", c);
    return 0;
}`,
      fuzz: { gen: 'unsigned', n: 4 }
    }
  );
})(typeof globalThis !== 'undefined' ? globalThis : this);
