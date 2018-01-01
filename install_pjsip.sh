mkdir ${HOME}/pjsip/
cd ${HOME}/pjsip/
wget http://www.pjsip.org/release/2.7.1/pjproject-2.7.1.tar.bz2
bzip2 -d pjproject-2.7.1.tar.bz2
tar xvf pjproject-2.7.1.tar
cd pjproject-2.7.1/
./configure CFLAGS=-fPIC -prefix=${HOME}/pjsip/pj-2.7.1/
make dep
make
sudo make install
cd ..
export PKG_CONFIG_PATH=${HOME}/pjsip/pj-2.7.1/lib/pkgconfig/;  npm install sipster