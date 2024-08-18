echo OFF
cls
if exist TODO.txt (
    rm TODO.txt   
)
git grep -EIi "TODO|FIXME" >> TODO.txt