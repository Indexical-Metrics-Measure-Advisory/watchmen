import random
import unittest
from src.watchmen_utilities.array_helper import ArrayHelper, ArrayReduce
from timeit import timeit
class TestArrayHelper(unittest.TestCase):
    # def test_reduce(self):
    #     random_array = [random.randint(1, 100) for _ in range(10)]
    #     array_helper = ArrayHelper(random_array)
    #     sum_func: ArrayReduce = lambda acc, val: acc + val
    #
    #     # start = timeit.timeit()
    #
    #     result = array_helper.reduce_(sum_func)
    #
    #     time_taken = timeit(lambda: array_helper.reduce_(sum_func), number=1000)
    #
    #     print(f"Loop took {time_taken:.4f} seconds on average")
    #
    #     # end = timeit.timeit()
    #     # time1 = end - start
    #     # print("result",result)
    #     #
    #     # start_1 = timeit.timeit()
    #     #
    #     # result = array_helper.reduce(sum_func)
    #     # # timeit.timeit("array_helper.reduce_(sum_func)")
    #     #
    #     # end_2 = timeit.timeit()
    #     #
    #     # time2 = end_2 - start_1
    #     # print("result2", result)
    #     #
    #     # print((time2/time1)*100)


    def test_map(self):
        random_array = [random.randint(1, 100) for _ in range(10000)]
        array_helper = ArrayHelper(random_array)
        map_func = lambda val: val * 2

        result = array_helper.map_(map_func)

        self.assertEqual(result.aList, [val * 2 for val in random_array])




if __name__ == '__main__':
    unittest.main()