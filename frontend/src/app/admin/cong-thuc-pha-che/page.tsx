
"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  imageUrl?: string;
  image?: string;
  base_price?: number | string;
  basePrice?: number | string;
  price?: number | string;
  category?: string | { name?: string; slug?: string };
  categoryName?: string;
  categorySlug?: string;
  is_available?: boolean;
  isAvailable?: boolean;
}

interface Ingredient {
  name: string;
  amount: string;
}

interface Recipe {
  ingredients: Ingredient[];
  steps: string[];
  time: string;
  note: string;
}

const recipes: Record<string, Recipe> = {
  "ca-phe-sua-da": {
    ingredients: [
      { name: "Cà phê espresso hoặc cà phê đậm đặc", amount: "40 ml" },
      { name: "Sữa đặc", amount: "25 ml" },
      { name: "Đá viên", amount: "150 g" },
    ],
    steps: [
      "Chuẩn bị ly sạch và cho sữa đặc vào đáy ly.",
      "Chiết xuất cà phê rồi rót vào ly.",
      "Khuấy đều cà phê với sữa đặc.",
      "Thêm đá viên, khuấy nhẹ và phục vụ.",
    ],
    time: "5 phút",
    note: "Có thể điều chỉnh lượng sữa theo độ ngọt mong muốn.",
  },

  "caramel-macchiato": {
    ingredients: [
      { name: "Espresso", amount: "30 ml" },
      { name: "Sữa tươi", amount: "150 ml" },
      { name: "Sốt caramel", amount: "20 ml" },
      { name: "Đá viên", amount: "120 g" },
    ],
    steps: [
      "Rót một phần sốt caramel vào ly.",
      "Thêm đá và sữa tươi.",
      "Chiết xuất espresso rồi rót từ từ lên trên.",
      "Trang trí với sốt caramel.",
    ],
    time: "5 phút",
    note: "Có thể dùng sữa đã đánh bọt nếu pha phiên bản nóng.",
  },

  americano: {
    ingredients: [
      { name: "Espresso", amount: "40 ml" },
      { name: "Nước lọc nóng hoặc lạnh", amount: "150 ml" },
      { name: "Đá viên nếu dùng lạnh", amount: "100 g" },
    ],
    steps: [
      "Chiết xuất espresso.",
      "Cho nước vào ly.",
      "Rót espresso vào nước.",
      "Thêm đá nếu phục vụ lạnh.",
    ],
    time: "3 phút",
    note: "Điều chỉnh lượng nước để đạt độ đậm mong muốn.",
  },

  cappuccino: {
    ingredients: [
      { name: "Espresso", amount: "30 ml" },
      { name: "Sữa tươi", amount: "120 ml" },
    ],
    steps: [
      "Chiết xuất espresso vào tách.",
      "Đánh nóng sữa tạo lớp bọt mịn.",
      "Rót sữa vào espresso.",
      "Hoàn thiện lớp bọt sữa trên bề mặt.",
    ],
    time: "5 phút",
    note: "Nên sử dụng sữa lạnh để tạo bọt ổn định.",
  },

  "tra-dao": {
    ingredients: [
      { name: "Trà đen đã ủ", amount: "150 ml" },
      { name: "Siro đào", amount: "20 ml" },
      { name: "Nước đường", amount: "15 ml" },
      { name: "Đào ngâm", amount: "40 g" },
      { name: "Đá viên", amount: "120 g" },
    ],
    steps: [
      "Ủ trà theo hướng dẫn của loại trà sử dụng rồi để nguội.",
      "Cho trà, siro đào và nước đường vào bình lắc.",
      "Thêm đá, lắc đều.",
      "Rót ra ly và thêm đào ngâm.",
    ],
    time: "5 phút",
    note: "Không nên ủ trà quá lâu vì có thể gây vị chát.",
  },

  "tra-dau": {
    ingredients: [
      { name: "Trà nền đã ủ", amount: "150 ml" },
      { name: "Siro dâu", amount: "20 ml" },
      { name: "Nước đường", amount: "15 ml" },
      { name: "Dâu tươi", amount: "30 g" },
      { name: "Đá viên", amount: "120 g" },
    ],
    steps: [
      "Chuẩn bị trà nền và để nguội.",
      "Cho trà, siro dâu và nước đường vào bình lắc.",
      "Thêm đá và lắc đều.",
      "Rót ra ly, trang trí bằng dâu tươi.",
    ],
    time: "5 phút",
    note: "Có thể điều chỉnh siro để cân bằng vị chua ngọt.",
  },

  "tra-vai-lai": {
    ingredients: [
      { name: "Trà lài đã ủ", amount: "150 ml" },
      { name: "Siro vải", amount: "20 ml" },
      { name: "Nước đường", amount: "10 ml" },
      { name: "Vải ngâm", amount: "40 g" },
      { name: "Đá viên", amount: "120 g" },
    ],
    steps: [
      "Ủ trà lài và để nguội.",
      "Kết hợp trà, siro vải và nước đường.",
      "Thêm đá rồi lắc đều.",
      "Rót ra ly và thêm vải ngâm.",
    ],
    time: "5 phút",
    note: "Giữ hương trà lài nhẹ nhàng, tránh pha quá đậm.",
  },

  "tra-chanh": {
    ingredients: [
      { name: "Trà đen đã ủ", amount: "150 ml" },
      { name: "Nước cốt chanh", amount: "15 ml" },
      { name: "Nước đường", amount: "20 ml" },
      { name: "Đá viên", amount: "120 g" },
    ],
    steps: [
      "Ủ trà và để nguội.",
      "Cho trà, nước cốt chanh và nước đường vào bình.",
      "Thêm đá rồi lắc đều.",
      "Rót ra ly và trang trí bằng lát chanh.",
    ],
    time: "4 phút",
    note: "Điều chỉnh lượng chanh và đường theo khẩu vị.",
  },

  "tra-luu-do": {
    ingredients: [
      { name: "Trà nền", amount: "150 ml" },
      { name: "Siro lựu", amount: "25 ml" },
      { name: "Nước đường", amount: "10 ml" },
      { name: "Đá viên", amount: "120 g" },
    ],
    steps: [
      "Chuẩn bị trà nền đã nguội.",
      "Kết hợp trà, siro lựu và nước đường.",
      "Thêm đá, lắc đều.",
      "Rót ra ly và trang trí theo tiêu chuẩn cửa hàng.",
    ],
    time: "4 phút",
    note: "Công thức mẫu, cần điều chỉnh theo loại siro thực tế.",
  },

  "tra-sua-dau": {
    ingredients: [
      { name: "Trà nền", amount: "120 ml" },
      { name: "Sữa tươi", amount: "60 ml" },
      { name: "Siro dâu", amount: "25 ml" },
      { name: "Bột kem béo", amount: "15 g" },
      { name: "Đá viên", amount: "120 g" },
    ],
    steps: [
      "Ủ trà rồi để nguội.",
      "Hòa tan bột kem béo với trà.",
      "Thêm sữa tươi và siro dâu.",
      "Lắc với đá rồi rót ra ly.",
    ],
    time: "5 phút",
    note: "Topping được chuẩn bị riêng theo yêu cầu của khách.",
  },

  "tra-sua-thai-xanh": {
    ingredients: [
      { name: "Trà Thái xanh đã ủ", amount: "150 ml" },
      { name: "Sữa tươi", amount: "50 ml" },
      { name: "Sữa đặc", amount: "20 ml" },
      { name: "Bột kem béo", amount: "10 g" },
      { name: "Đá viên", amount: "120 g" },
    ],
    steps: [
      "Ủ trà Thái xanh, lọc bỏ bã và để nguội.",
      "Hòa tan bột kem béo trong trà.",
      "Thêm sữa tươi và sữa đặc.",
      "Lắc với đá rồi rót ra ly.",
    ],
    time: "5 phút",
    note: "Có thể điều chỉnh lượng sữa đặc theo độ ngọt yêu cầu.",
  },

  "tra-sua-tran-chau": {
    ingredients: [
      { name: "Trà đen đã ủ", amount: "150 ml" },
      { name: "Sữa tươi", amount: "60 ml" },
      { name: "Sữa đặc", amount: "20 ml" },
      { name: "Bột kem béo", amount: "10 g" },
      { name: "Trân châu đã nấu", amount: "50 g" },
      { name: "Đá viên", amount: "100 g" },
    ],
    steps: [
      "Nấu trân châu theo hướng dẫn của nhà cung cấp.",
      "Ủ trà và để nguội.",
      "Khuấy trà cùng sữa tươi, sữa đặc và bột kem béo.",
      "Cho trân châu vào ly, thêm đá và rót trà sữa.",
    ],
    time: "7 phút",
    note: "Trân châu nên được sử dụng trong thời gian bảo quản phù hợp.",
  },

  "matcha-da-xay": {
    ingredients: [
      { name: "Bột matcha", amount: "5 g" },
      { name: "Sữa tươi", amount: "120 ml" },
      { name: "Sữa đặc", amount: "20 ml" },
      { name: "Đá viên", amount: "180 g" },
    ],
    steps: [
      "Rây bột matcha để hạn chế vón cục.",
      "Hòa matcha với một ít nước ấm.",
      "Cho matcha, sữa, sữa đặc và đá vào máy xay.",
      "Xay đến khi hỗn hợp mịn rồi rót ra ly.",
    ],
    time: "5 phút",
    note: "Công thức mẫu; điều chỉnh lượng đá theo công suất máy xay.",
  },

  "chocolate-da-xay": {
    ingredients: [
      { name: "Bột chocolate", amount: "20 g" },
      { name: "Sữa tươi", amount: "120 ml" },
      { name: "Sữa đặc", amount: "20 ml" },
      { name: "Đá viên", amount: "180 g" },
    ],
    steps: [
      "Hòa tan bột chocolate với một ít sữa.",
      "Cho hỗn hợp vào máy xay.",
      "Thêm sữa, sữa đặc và đá.",
      "Xay mịn rồi rót ra ly.",
    ],
    time: "5 phút",
    note: "Có thể dùng sốt chocolate để trang trí.",
  },

  "oreo-da-xay": {
    ingredients: [
      { name: "Bánh Oreo", amount: "3 chiếc" },
      { name: "Sữa tươi", amount: "120 ml" },
      { name: "Sữa đặc", amount: "20 ml" },
      { name: "Đá viên", amount: "180 g" },
    ],
    steps: [
      "Bẻ bánh Oreo thành miếng nhỏ.",
      "Cho bánh, sữa tươi, sữa đặc và đá vào máy xay.",
      "Xay đến khi hỗn hợp hòa quyện.",
      "Rót ra ly và trang trí bằng vụn bánh.",
    ],
    time: "5 phút",
    note: "Điều chỉnh độ đặc bằng lượng sữa và đá.",
  },

  
"banh-croissant": {
  ingredients: [
    { name: "Bột mì làm bánh mì", amount: "250 g" },
    { name: "Sữa tươi không đường lạnh", amount: "125 ml" },
    { name: "Đường", amount: "30 g" },
    { name: "Bơ lạt", amount: "25 g" },
    { name: "Muối", amount: "5 g" },
    { name: "Men nở instant", amount: "5 g" },
    { name: "Bơ cán lớp", amount: "125 g" },
    { name: "Trứng gà đánh tan để quét mặt", amount: "1 quả" },
  ],
  steps: [
    "Trộn bột mì, đường, muối và men trong âu. Thêm sữa lạnh và 25 g bơ lạt, nhào đến khi bột tương đối mịn và đàn hồi.",
    "Bọc kín khối bột, để lạnh khoảng 30–60 phút để bột dễ cán.",
    "Đặt 125 g bơ cán lớp giữa hai tờ giấy nến, cán thành miếng vuông đều nhau. Làm lạnh để bơ dẻo nhưng không cứng giòn.",
    "Cán bột thành hình chữ nhật, đặt miếng bơ vào giữa rồi gấp bột bao kín bơ.",
    "Cán dài và gấp ba. Bọc kín, làm lạnh khoảng 30 phút. Lặp lại thao tác cán và gấp thêm 2 lần, giữ bơ không bị chảy.",
    "Cán bột thành tấm dày khoảng 3–4 mm, cắt thành các hình tam giác rồi cuộn từ cạnh đáy lên thành hình croissant.",
    "Xếp bánh lên khay có lót giấy nến. Ủ ở khoảng 24–27°C đến khi bánh nở rõ, lớp bột mềm và rung nhẹ khi di chuyển khay; thời gian có thể khoảng 2–3 giờ tùy điều kiện.",
    "Làm nóng lò trước. Quét một lớp trứng mỏng lên mặt bánh, tránh để trứng chảy vào các mép lớp bột.",
    "Nướng tham khảo ở 190–200°C trong khoảng 15–22 phút, tùy kích thước bánh và loại lò, đến khi bánh nở xốp và có màu vàng nâu đều.",
    "Đặt bánh lên rack cho nguội. Khi phục vụ lại bánh đã nướng, làm nóng ở khoảng 160–170°C trong 3–5 phút và kiểm tra để bánh không bị khô.",
  ],
  time: "Khoảng 4–6 giờ, chưa tính thời gian làm lạnh dài",
  note: "Đây là công thức croissant làm từ bột và bơ cán lớp, không phải quy trình làm nóng bánh đông lạnh. Giữ bơ và bột đủ lạnh trong khi cán; điều chỉnh nhiệt độ nướng theo lò thực tế.",
},


  
"banh-kem-dau": {
  ingredients: [
    { name: "Trứng gà", amount: "3 quả" },
    { name: "Bột mì đa dụng", amount: "90 g" },
    { name: "Đường", amount: "90 g" },
    { name: "Sữa tươi không đường", amount: "30 ml" },
    { name: "Dầu ăn", amount: "25 ml" },
    { name: "Vanilla", amount: "3 ml" },
    { name: "Whipping cream lạnh", amount: "300 ml" },
    { name: "Đường bột cho kem", amount: "25–30 g" },
    { name: "Dâu tây tươi", amount: "200 g" },
    { name: "Siro đường làm ẩm cốt bánh", amount: "30–40 ml" },
  ],
  steps: [
    "Làm nóng lò ở khoảng 165–170°C. Lót giấy nến vào đáy khuôn tròn đường kính khoảng 16–18 cm.",
    "Tách lòng đỏ và lòng trắng trứng vào hai âu sạch, khô. Tránh để lòng đỏ hoặc dầu mỡ lẫn vào lòng trắng.",
    "Đánh lòng đỏ với một phần đường, sau đó thêm sữa, dầu ăn và vanilla. Rây bột mì vào, trộn vừa hòa quyện.",
    "Đánh lòng trắng đến khi nổi bọt, thêm phần đường còn lại từ từ và đánh đến chóp mềm hoặc chóp vừa.",
    "Trộn một phần lòng trắng vào hỗn hợp lòng đỏ để làm nhẹ hỗn hợp, sau đó fold nhẹ phần lòng trắng còn lại để giữ bọt khí.",
    "Đổ bột vào khuôn, gõ nhẹ để loại bọt khí lớn. Nướng khoảng 25–35 phút tùy khuôn và lò. Kiểm tra bằng que thử; điều chỉnh thời gian nếu cốt bánh chưa chín.",
    "Lấy cốt bánh ra, để nguội hoàn toàn trên rack. Không phết kem lên cốt bánh còn nóng.",
    "Để âu và que đánh sạch, lạnh. Đánh whipping cream với đường bột đến khi kem bông vừa, đứng form nhưng vẫn mịn.",
    "Rửa dâu nhanh, lau khô hoàn toàn, bỏ cuống. Cắt một phần dâu thành lát để làm nhân và giữ lại vài quả đẹp để trang trí.",
    "Cắt cốt bánh thành 2–3 lớp. Quét một lượng siro vừa đủ lên mặt bánh, phết kem và xếp dâu giữa các lớp.",
    "Phủ kem bên ngoài, làm phẳng bằng spatula rồi trang trí dâu tươi. Bảo quản lạnh ngay sau khi hoàn thiện.",
  ],
  time: "Khoảng 90–120 phút",
  note: "Định lượng tham khảo cho một bánh nhỏ. Dâu phải khô trước khi lắp bánh; bánh có kem tươi cần được giữ lạnh ở nhiệt độ an toàn theo quy định thực phẩm địa phương.",
},


  
"banh-tart": {
  ingredients: [
    { name: "Bột mì đa dụng làm vỏ", amount: "150 g" },
    { name: "Bơ lạt lạnh", amount: "75 g" },
    { name: "Đường bột", amount: "35 g" },
    { name: "Lòng đỏ trứng cho vỏ", amount: "1 lòng đỏ" },
    { name: "Nước lạnh", amount: "10–15 ml, tùy độ khô" },
    { name: "Trứng gà làm nhân", amount: "2 quả" },
    { name: "Sữa tươi không đường", amount: "150 ml" },
    { name: "Whipping cream", amount: "100 ml" },
    { name: "Đường cho nhân", amount: "45 g" },
    { name: "Vanilla", amount: "3 ml" },
  ],
  steps: [
    "Cắt bơ lạnh thành hạt nhỏ. Trộn với bột mì và đường bột đến khi hỗn hợp giống vụn bánh mì, hạn chế làm bơ nóng chảy.",
    "Thêm lòng đỏ và từng ít nước lạnh. Trộn vừa đủ để bột kết dính, không nhào quá lâu.",
    "Bọc kín bột, làm lạnh 30 phút. Cán bột dày khoảng 3 mm rồi lót vào khuôn tart, ép sát đáy và thành khuôn.",
    "Chọc nhẹ đáy vỏ bằng nĩa, làm lạnh thêm 15 phút. Làm nóng lò ở khoảng 175–180°C.",
    "Lót giấy nến lên vỏ và thêm hạt nướng hoặc vật nặng chuyên dụng. Nướng sơ khoảng 12–15 phút; bỏ vật nặng và nướng thêm 5 phút nếu đáy còn ẩm.",
    "Đánh trứng và đường vừa hòa quyện, không đánh quá mạnh để tránh tạo nhiều bọt.",
    "Làm ấm sữa và whipping cream đến khi nóng nhẹ, không đun sôi. Rót từ từ vào trứng trong khi khuấy liên tục.",
    "Thêm vanilla, lọc hỗn hợp qua rây để nhân mịn. Để nguội bớt rồi rót vào vỏ tart đã nướng sơ.",
    "Hạ lò xuống khoảng 150–160°C. Nướng khoảng 25–35 phút tùy kích thước khuôn, đến khi phần nhân gần đông và tâm bánh còn hơi rung nhẹ.",
    "Lấy bánh ra để nguội. Làm lạnh trước khi cắt để nhân ổn định và dễ phục vụ.",
  ],
  time: "Khoảng 90 phút, chưa tính thời gian làm lạnh",
  note: "Đây là công thức tart trứng tham khảo. Thời gian nướng thay đổi theo kích thước khuôn; nhân trứng cần được nấu chín an toàn và bánh phải được bảo quản lạnh phù hợp.",
},

  
tiramisu: {
  ingredients: [
    { name: "Mascarpone", amount: "250 g" },
    { name: "Whipping cream lạnh", amount: "200 ml" },
    { name: "Đường bột", amount: "60 g" },
    { name: "Bánh ladyfinger", amount: "150 g" },
    { name: "Cà phê espresso đã pha", amount: "180 ml" },
    { name: "Bột cacao không đường", amount: "10 g" },
    { name: "Vanilla", amount: "3 ml" },
  ],
  steps: [
    "Pha espresso và để nguội hoàn toàn. Đổ cà phê vào khay nông để thuận tiện nhúng bánh.",
    "Để mascarpone mềm nhẹ trong ngăn mát, sau đó khuấy bằng phới đến khi mịn. Không đánh quá lâu vì phô mai có thể bị tách nước.",
    "Đánh whipping cream lạnh với đường bột và vanilla đến chóp mềm-vừa.",
    "Fold whipping cream vào mascarpone thành nhiều lần, trộn nhẹ tay đến khi hỗn hợp đồng nhất và giữ được độ bông.",
    "Nhúng nhanh từng chiếc ladyfinger vào cà phê đã nguội. Không ngâm lâu vì bánh sẽ hút quá nhiều chất lỏng và dễ nhũn.",
    "Xếp một lớp bánh vào hộp hoặc khuôn. Phủ một lớp kem mascarpone lên trên và dàn đều.",
    "Lặp lại một lớp bánh và một lớp kem nữa. Làm phẳng mặt kem.",
    "Đậy kín và để lạnh ít nhất 4–6 giờ, tốt nhất qua đêm, để các lớp ổn định và hương vị hòa quyện.",
    "Rây cacao lên mặt bánh ngay trước khi phục vụ. Chia phần bằng dao sạch, lau dao giữa các lần cắt.",
  ],
  time: "Khoảng 45 phút chuẩn bị + 4–6 giờ làm lạnh",
  note: "Công thức này không dùng trứng sống. Luôn giữ mascarpone và kem lạnh trong quá trình chế biến; bảo quản thành phẩm trong tủ lạnh và sử dụng trong thời hạn an toàn của cửa hàng.",
}
}
function getSlug(product: Product) {
  if (product.slug) return product.slug;

  return product.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCategory(product: Product) {
  if (typeof product.category === "string") {
    return product.category;
  }

  return (
    product.category?.name ||
    product.categoryName ||
    product.category?.slug ||
    product.categorySlug ||
    "Chưa phân loại"
  );
}

function getImage(product: Product) {
  return product.image_url || product.imageUrl || product.image || "";
}

function getPrice(product: Product) {
  return Number(product.base_price ?? product.basePrice ?? product.price ?? 0);
}

export default function CongThucPhaChePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/menu/products`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`API trả về HTTP ${response.status}`);
        }

        const data = await response.json();

        const list: Product[] = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : Array.isArray(data.data)
              ? data.data
              : [];

        setProducts(list);

        if (list.length === 0) {
          setError("API chưa trả về danh sách món. Hãy kiểm tra dữ liệu menu.");
        }
      } catch (err) {
        console.error("Lỗi tải menu:", err);
        setError(
          "Không tải được menu. Hãy kiểm tra backend và API /menu/products."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const categories = useMemo(
    () => [
      "all",
      ...Array.from(new Set(products.map(getCategory))),
    ],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesCategory =
        category === "all" || getCategory(product) === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const recipe = selected ? recipes[getSlug(selected)] : undefined;

  return (
    <div className="recipe-page">
      <style jsx>{`
        .recipe-page {
          color: #38291f;
        }

        .recipe-heading {
          margin-bottom: 24px;
        }

        .recipe-heading h1 {
          margin: 0 0 8px;
          font-size: clamp(25px, 3vw, 32px);
          color: #543b2d;
        }

        .recipe-heading p {
          margin: 0;
          color: #81776d;
          font-size: 14px;
          line-height: 1.7;
        }

        .recipe-layout {
          display: grid;
          grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.3fr);
          gap: 22px;
          align-items: start;
        }

        .recipe-panel {
          min-width: 0;
          background: #fff;
          border: 1px solid #eee7df;
          border-radius: 16px;
          overflow: hidden;
        }

        .panel-heading {
          padding: 18px 20px;
          border-bottom: 1px solid #eee7df;
        }

        .panel-heading h2 {
          margin: 0 0 5px;
          font-size: 17px;
        }

        .panel-heading p {
          margin: 0;
          font-size: 12px;
          color: #81776d;
        }

        .recipe-controls {
          display: grid;
          gap: 10px;
          padding: 14px 16px;
        }

        .recipe-controls input,
        .recipe-controls select {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          padding: 11px 12px;
          border: 1px solid #e6ddd3;
          border-radius: 9px;
          background: #fff;
          color: #38291f;
          font: inherit;
          font-size: 13px;
          outline-color: #785640;
        }

        .product-list {
          display: grid;
          gap: 7px;
          padding: 0 12px 14px;
          max-height: 620px;
          overflow-y: auto;
        }

        .product-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px;
          border: 1px solid transparent;
          border-radius: 11px;
          background: #fff;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .product-item:hover {
          background: #faf6f1;
        }

        .product-item.active {
          background: #f7efe7;
          border-color: #cbb39e;
        }

        .product-image {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 55px;
          height: 55px;
          border-radius: 9px;
          overflow: hidden;
          background: #f4ede5;
          color: #785640;
          font-size: 23px;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-info {
          min-width: 0;
          flex: 1;
        }

        .product-info strong {
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .product-info span {
          color: #81776d;
          font-size: 12px;
        }

        .product-arrow {
          color: #9a8877;
          font-size: 19px;
        }

        .detail-body {
          padding: 20px;
        }

        .empty-detail {
          display: grid;
          place-items: center;
          min-height: 300px;
          padding: 30px;
          text-align: center;
          color: #81776d;
        }

        .empty-detail .cup {
          margin-bottom: 12px;
          font-size: 42px;
        }

        .detail-title {
          margin: 0 0 7px;
          color: #543b2d;
          font-size: 24px;
          overflow-wrap: anywhere;
        }

        .detail-description {
          margin: 0 0 17px;
          color: #81776d;
          font-size: 13px;
          line-height: 1.7;
        }

        .detail-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 22px;
        }

        .detail-tag {
          padding: 7px 10px;
          border-radius: 8px;
          background: #f7f2ec;
          color: #785640;
          font-size: 12px;
        }

        .recipe-section {
          margin-top: 22px;
        }

        .recipe-section h3 {
          margin: 0 0 13px;
          font-size: 16px;
        }

        .ingredient-list {
          display: grid;
          gap: 0;
        }

        .ingredient-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f0ebe5;
          font-size: 13px;
        }

        .ingredient-row span:last-child {
          flex-shrink: 0;
          color: #785640;
          font-weight: 700;
        }

        .step-list {
          display: grid;
          gap: 13px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .step-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-size: 13px;
          line-height: 1.7;
        }

        .step-number {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 27px;
          height: 27px;
          border-radius: 50%;
          background: #785640;
          color: white;
          font-size: 12px;
          font-weight: 700;
        }

        .recipe-note {
          margin-top: 20px;
          padding: 13px 14px;
          border-radius: 10px;
          background: #fbf5e9;
          color: #765a32;
          font-size: 12px;
          line-height: 1.7;
        }

        .recipe-message {
          padding: 18px;
          color: #81776d;
          font-size: 13px;
          line-height: 1.7;
        }

        .recipe-error {
          color: #b42318;
        }

        @media (max-width: 850px) {
          .recipe-layout {
            grid-template-columns: 1fr;
          }

          .product-list {
            max-height: 350px;
          }
        }

        @media (max-width: 480px) {
          .detail-body {
            padding: 15px;
          }

          .detail-title {
            font-size: 21px;
          }

          .product-image {
            width: 47px;
            height: 47px;
          }
        }
      `}</style>

      <section className="recipe-heading">
        <h1><b>Công thức pha chế</b></h1>
        <p>
          Tra cứu nguyên liệu, định lượng và quy trình chuẩn bị
          cho từng món trong thực đơn BrewLite.
        </p>
      </section>

      {error && (
        <div
          className={`recipe-message ${products.length === 0 ? "recipe-error" : ""}`}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="recipe-layout">
        <section className="recipe-panel">
          <div className="panel-heading">
            <h2>Danh sách món</h2>
            <p>
              {loading
                ? "Đang tải thực đơn..."
                : `${filteredProducts.length} món`}
            </p>
          </div>

          <div className="recipe-controls">
            <input
              type="search"
              placeholder="Tìm tên món..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Tìm món trong thực đơn"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Lọc theo danh mục"
            >
              <option value="all">Tất cả danh mục</option>
              {categories
                .filter((item) => item !== "all")
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </div>

          {loading ? (
            <div className="recipe-message">Đang tải danh sách món...</div>
          ) : (
            <div className="product-list">
              {filteredProducts.map((product) => {
                const image = getImage(product);
                const active = selected?.id === product.id;

                return (
                  <button
                    type="button"
                    key={product.id}
                    className={`product-item ${active ? "active" : ""}`}
                    onClick={() => setSelected(product)}
                    aria-pressed={active}
                  >
                    <div className="product-image">
                      {image ? (
                        <img src={image} alt={product.name} />
                      ) : (
                        "☕"
                      )}
                    </div>

                    <div className="product-info">
                      <strong>{product.name}</strong>
                      <span>{getCategory(product)}</span>
                    </div>

                    <span className="product-arrow">›</span>
                  </button>
                );
              })}

              {!loading && filteredProducts.length === 0 && (
                <div className="recipe-message">
                  Không tìm thấy món phù hợp.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="recipe-panel">
          <div className="panel-heading">
            <h2>Chi tiết công thức</h2>
            <p>Chọn một món ở danh sách để xem hướng dẫn.</p>
          </div>

          {!selected ? (
            <div className="empty-detail">
              <div>
                <div className="cup">☕</div>
                <strong>Chưa chọn món</strong>
                <p>
                  Chọn món trong danh sách bên trái để xem
                  nguyên liệu và các bước pha chế.
                </p>
              </div>
            </div>
          ) : (
            <div className="detail-body">
              <h2 className="detail-title">{selected.name}</h2>

              <p className="detail-description">
                {selected.description ||
                  "Công thức tham khảo cho món trong thực đơn BrewLite."}
              </p>

              <div className="detail-tags">
                <span className="detail-tag">
                  {getCategory(selected)}
                </span>
                <span className="detail-tag">
                  Giá: {getPrice(selected).toLocaleString("vi-VN")} đ
                </span>
                <span className="detail-tag">
                  {recipe?.time || "Chưa cập nhật thời gian"}
                </span>
              </div>

              {recipe ? (
                <>
                  <section className="recipe-section">
                    <h3>🧾 Nguyên liệu và định lượng</h3>

                    <div className="ingredient-list">
                      {recipe.ingredients.map((ingredient, index) => (
                        <div
                          className="ingredient-row"
                          key={`${ingredient.name}-${index}`}
                        >
                          <span>{ingredient.name}</span>
                          <span>{ingredient.amount}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="recipe-section">
                    <h3>👨‍🍳 Các bước thực hiện</h3>

                    <ol className="step-list">
                      {recipe.steps.map((step, index) => (
                        <li className="step-item" key={`${index}-${step}`}>
                          <span className="step-number">{index + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <div className="recipe-note">
                    <strong>Lưu ý: </strong>
                    {recipe.note}
                    <br />
                    Định lượng hiện tại là công thức mẫu, cần được
                    kiểm tra và điều chỉnh theo tiêu chuẩn thực tế của BrewLite.
                  </div>
                </>
              ) : (
                <div className="recipe-message">
                  Món này chưa có công thức mẫu. Hãy bổ sung công thức
                  tương ứng với mã món: <strong>{getSlug(selected)}</strong>.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
