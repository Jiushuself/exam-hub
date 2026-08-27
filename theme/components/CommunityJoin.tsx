const QUARK_GROUP_URL = 'https://pan.quark.cn/g/093780a133';
const QQ_GROUP_QR_URL = '/community/qq-group-qr.png';

export function CommunityJoin() {
  return (
    <section
      className="community-join"
      id="join-community"
      aria-labelledby="community-join-title"
    >
      <header className="community-join__header">
        <div>
          <span>COMMUNITY / JOIN</span>
          <h1 id="community-join-title">加入交流群</h1>
        </div>
        <p>接收资料更新、反馈失效链接，也可以和其他考生交流备考进度。</p>
      </header>

      <div className="community-join__grid">
        <article className="community-card community-card--quark">
          <div className="community-card__content">
            <span className="community-card__label">推荐 · 长期入口</span>
            <h3>夸克网盘群</h3>
            <strong>考研考公一锅烩 2 群</strong>
            <p>手机点击按钮即可加入，也可以使用夸克 App 扫描右侧二维码。</p>
            <a
              className="community-card__action"
              href={QUARK_GROUP_URL}
              target="_blank"
              rel="noreferrer"
            >
              点击加入夸克群
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <a
            className="community-card__qr"
            href={QUARK_GROUP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="扫描或点击加入夸克网盘群"
          >
            <img
              src="/community/quark-group-qr.png"
              alt="考研考公一锅烩 2 群夸克网盘群二维码"
              width="258"
              height="267"
              loading="lazy"
            />
          </a>
        </article>

        <article className="community-card community-card--qq">
          <div className="community-card__content">
            <span className="community-card__label">QQ 群 · 长期入口</span>
            <h3>QQ 备考交流群</h3>
            <strong>考研考公交流与资料通知</strong>
            <p>
              请使用手机 QQ 扫描右侧二维码加入，点击二维码可以打开大图保存。
            </p>
            <a
              className="community-card__action community-card__action--qq"
              href={QQ_GROUP_QR_URL}
              target="_blank"
              rel="noreferrer"
            >
              打开 QQ 群二维码
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <a
            className="community-card__qr"
            href={QQ_GROUP_QR_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="打开 QQ 交流群二维码大图"
          >
            <img
              src={QQ_GROUP_QR_URL}
              alt="考研考公 QQ 交流群二维码"
              width="1059"
              height="1126"
              loading="lazy"
            />
          </a>
        </article>
      </div>
    </section>
  );
}
