class car:
    def __int__(self,make,model,year):
        """make a parent class called car"""
        self.make=make
        self.model=model
        self.year=year
    def get_fullname(self):
        get_fullname=f"{self.make}  {self.model} {self.year}"
class electric_car(car):
    def __init__(self,make,model,year):
        super().__init__(make,model,year)

my_tesla = electric_car('tesla','model s',2019) 
print(my_tesla.get_fullname()) 
