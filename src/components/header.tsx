import Cta from '../components/cta';

type Link = {
  label: string;
  uRL: string;
};

type Header = {
  links: Link[];
  logo: string;
};

const Header = (props: Header) => {
  const { links, logo } = props;
  return (
    <>
      <div className="centered-container">
        <nav className="py-6 flex items-center justify-between">
          <img src={logo} width="50" height="50"></img>
          <div className="text-2xl font-semibold">Yext's Fashion Warehouse</div>
          <div className="flex gap-x-10 text-lg font-semibold">
            {links.map((link, idx) => 
              <a key={idx} href={link.uRL} target="_blank">
                {link.label}
              </a>
            )}
          </div>
          {/* <div className="space-x-5">
            <Cta buttonText="Order Pickup" url="#" style="primary-cta"></Cta>
            <Cta buttonText="Order Delivery" url="#" style="secondary-cta"></Cta>
          </div> */}
        </nav>
      </div>
    </>
  );
};

export default Header;
